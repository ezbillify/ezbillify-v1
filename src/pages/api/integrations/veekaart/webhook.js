// pages/api/integrations/veekaart/webhook.js
import { supabase } from '../../../../lib/supabase'
import { generateNextDocumentNumber } from '../../settings/document-numbering'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // Verify webhook signature
    const signature = req.headers['x-veekaart-signature']
    const payload = JSON.stringify(req.body)
    
    // Get integration config to verify signature
    const { company_id, event_type, data } = req.body
    
    if (!company_id || !event_type || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required webhook data'
      })
    }

    // Fetch integration to verify signature
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('integration_type', 'veekaart')
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return res.status(404).json({
        success: false,
        error: 'VeeKaart integration not found or inactive'
      })
    }

    // Verify webhook signature if secret is configured
    if (integration.webhook_secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', integration.webhook_secret)
        .update(payload)
        .digest('hex')

      if (signature !== expectedSignature) {
        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature'
        })
      }
    }

    // Log webhook event
    const webhookLog = {
      company_id,
      integration_id: integration.id,
      event_type,
      event_data: req.body,
      webhook_url: req.url,
      status: 'received',
      received_at: new Date().toISOString()
    }

    const { data: logEntry } = await supabase
      .from('webhook_events')
      .insert(webhookLog)
      .select()
      .single()

    // Process webhook based on event type
    let result
    switch (event_type) {
      case 'order.created':
      case 'order.confirmed':
        result = await handleOrderCreated(integration, data)
        break
      case 'order.cancelled':
        result = await handleOrderCancelled(integration, data)
        break
      case 'customer.created':
        result = await handleCustomerCreated(integration, data)
        break
      case 'customer.updated':
        result = await handleCustomerUpdated(integration, data)
        break
      case 'product.updated':
        result = await handleProductUpdated(integration, data)
        break
      case 'product.stock_changed':
        result = await handleStockChanged(integration, data)
        break
      default:
        result = { success: false, error: `Unknown event type: ${event_type}` }
    }

    // Update webhook log with result
    await supabase
      .from('webhook_events')
      .update({
        status: result.success ? 'processed' : 'failed',
        processed_at: new Date().toISOString(),
        response_data: result,
        error_message: result.success ? null : result.error
      })
      .eq('id', logEntry.id)

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message || 'Webhook processed successfully',
        data: result.data
      })
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      })
    }

  } catch (error) {
    console.error('Webhook processing error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Handle order created/confirmed - Generate invoice and deduct inventory
async function handleOrderCreated(integration, orderData) {
  try {
    const { order } = orderData

    // Check if order already processed
    const { data: existingInvoice } = await supabase
      .from('sales_documents')
      .select('id, document_number')
      .eq('company_id', integration.company_id)
      .eq('document_type', 'invoice')
      .eq('veekaart_order_id', order.id)
      .single()

    if (existingInvoice) {
      return {
        success: true,
        message: `Order already processed as invoice ${existingInvoice.document_number}`,
        data: { invoice_id: existingInvoice.id }
      }
    }

    // Find or create customer
    const customer = await findOrCreateCustomer(integration.company_id, order.customer)

    // Generate invoice number using document numbering
    const { document_number } = await generateNextDocumentNumber(integration.company_id, 'invoice')

    // Calculate totals
    const subtotal = parseFloat(order.subtotal) || 0
    const taxAmount = parseFloat(order.tax_amount) || 0
    const totalAmount = parseFloat(order.total_amount) || 0

    // Create sales document (invoice)
    const invoiceData = {
      company_id: integration.company_id,
      document_type: 'invoice',
      document_number,
      document_date: order.order_date || new Date().toISOString().split('T')[0],
      customer_id: customer.id,
      customer_name: customer.name,
      customer_gstin: customer.gstin,
      billing_address: order.billing_address || customer.billing_address,
      shipping_address: order.shipping_address || customer.shipping_address,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: 'confirmed',
      payment_status: order.payment_status || 'unpaid',
      notes: `Auto-generated from VeeKaart order: ${order.order_number}`,
      veekaart_order_id: order.id,
      veekaart_order_number: order.order_number,
      created_at: new Date().toISOString()
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('sales_documents')
      .insert(invoiceData)
      .select()
      .single()

    if (invoiceError) {
      throw new Error(`Failed to create invoice: ${invoiceError.message}`)
    }

    // Process order items
    const processedItems = []
    let totalItemsProcessed = 0
    let inventoryErrors = []

    for (const orderItem of order.items || []) {
      try {
        // Find item in EzBillify
        const { data: item } = await supabase
          .from('items')
          .select('*')
          .eq('company_id', integration.company_id)
          .or(`veekaart_product_id.eq.${orderItem.product_id},item_code.eq.${orderItem.sku}`)
          .single()

        if (!item) {
          inventoryErrors.push(`Item not found: ${orderItem.sku}`)
          continue
        }

        // Create invoice item
        const invoiceItem = {
          document_id: invoice.id,
          item_id: item.id,
          item_code: item.item_code,
          item_name: orderItem.name || item.item_name,
          description: orderItem.description,
          quantity: parseFloat(orderItem.quantity) || 1,
          unit_name: orderItem.unit || 'PCS',
          rate: parseFloat(orderItem.price) || 0,
          discount_percentage: parseFloat(orderItem.discount_percent) || 0,
          discount_amount: parseFloat(orderItem.discount_amount) || 0,
          taxable_amount: parseFloat(orderItem.line_total) || 0,
          tax_rate: parseFloat(orderItem.tax_rate) || 0,
          cgst_rate: parseFloat(orderItem.cgst_rate) || 0,
          sgst_rate: parseFloat(orderItem.sgst_rate) || 0,
          igst_rate: parseFloat(orderItem.igst_rate) || 0,
          cgst_amount: parseFloat(orderItem.cgst_amount) || 0,
          sgst_amount: parseFloat(orderItem.sgst_amount) || 0,
          igst_amount: parseFloat(orderItem.igst_amount) || 0,
          total_amount: parseFloat(orderItem.line_total) || 0,
          hsn_sac_code: item.hsn_sac_code
        }

        await supabase
          .from('sales_document_items')
          .insert(invoiceItem)

        // Update inventory if item tracks inventory
        if (item.track_inventory) {
          const quantity = parseFloat(orderItem.quantity) || 1
          
          // Check stock availability
          if (item.current_stock < quantity) {
            inventoryErrors.push(`Insufficient stock for ${item.item_code}: Available ${item.current_stock}, Required ${quantity}`)
          } else {
            // Create inventory movement (stock out)
            await supabase
              .from('inventory_movements')
              .insert({
                company_id: integration.company_id,
                item_id: item.id,
                item_code: item.item_code,
                movement_type: 'out',
                quantity: quantity,
                reference_type: 'sales_document',
                reference_id: invoice.id,
                reference_number: document_number,
                stock_before: item.current_stock,
                stock_after: item.current_stock - quantity,
                movement_date: new Date().toISOString().split('T')[0],
                notes: `VeeKaart order: ${order.order_number}`
              })

            // Update item stock levels
            await supabase
              .from('items')
              .update({
                current_stock: item.current_stock - quantity,
                available_stock: (item.available_stock || item.current_stock) - quantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)
          }
        }

        processedItems.push({
          item_code: item.item_code,
          quantity: orderItem.quantity,
          amount: orderItem.line_total
        })
        totalItemsProcessed++

      } catch (itemError) {
        console.error(`Error processing item ${orderItem.sku}:`, itemError)
        inventoryErrors.push(`Error processing ${orderItem.sku}: ${itemError.message}`)
      }
    }

    // Send invoice details back to VeeKaart
    const veekaartResponse = await notifyVeeKaartOfInvoice(integration, order.id, {
      invoice_id: invoice.id,
      invoice_number: document_number,
      invoice_date: invoice.document_date,
      invoice_amount: totalAmount,
      invoice_status: 'generated',
      invoice_url: `${process.env.NEXT_PUBLIC_APP_URL}/sales/invoices/${invoice.id}`,
      items_processed: totalItemsProcessed,
      inventory_warnings: inventoryErrors
    })

    return {
      success: true,
      message: `Invoice ${document_number} created successfully for order ${order.order_number}`,
      data: {
        invoice_id: invoice.id,
        invoice_number: document_number,
        customer_id: customer.id,
        items_processed: totalItemsProcessed,
        inventory_warnings: inventoryErrors,
        veekaart_notified: veekaartResponse.success
      }
    }

  } catch (error) {
    console.error('Order processing error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Handle order cancellation - Reverse inventory if needed
async function handleOrderCancelled(integration, orderData) {
  try {
    const { order } = orderData

    // Find existing invoice
    const { data: invoice } = await supabase
      .from('sales_documents')
      .select('*')
      .eq('company_id', integration.company_id)
      .eq('veekaart_order_id', order.id)
      .single()

    if (!invoice) {
      return {
        success: true,
        message: 'No invoice found for this order',
        data: { action: 'none' }
      }
    }

    // Update invoice status
    await supabase
      .from('sales_documents')
      .update({
        status: 'cancelled',
        notes: (invoice.notes || '') + `\nCancelled from VeeKaart on ${new Date().toISOString()}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice.id)

    // Reverse inventory movements if configured
    const shouldReverseInventory = true // This could be a setting

    if (shouldReverseInventory) {
      // Get invoice items
      const { data: invoiceItems } = await supabase
        .from('sales_document_items')
        .select('*')
        .eq('document_id', invoice.id)

      for (const item of invoiceItems || []) {
        if (item.item_id) {
          // Get current item stock
          const { data: currentItem } = await supabase
            .from('items')
            .select('current_stock, available_stock, track_inventory')
            .eq('id', item.item_id)
            .single()

          if (currentItem && currentItem.track_inventory) {
            // Create reverse inventory movement (stock in)
            await supabase
              .from('inventory_movements')
              .insert({
                company_id: integration.company_id,
                item_id: item.item_id,
                item_code: item.item_code,
                movement_type: 'in',
                quantity: item.quantity,
                reference_type: 'sales_document_cancellation',
                reference_id: invoice.id,
                reference_number: invoice.document_number,
                stock_before: currentItem.current_stock,
                stock_after: currentItem.current_stock + item.quantity,
                movement_date: new Date().toISOString().split('T')[0],
                notes: `Reversed due to VeeKaart order cancellation: ${order.order_number}`
              })

            // Update item stock
            await supabase
              .from('items')
              .update({
                current_stock: currentItem.current_stock + item.quantity,
                available_stock: (currentItem.available_stock || currentItem.current_stock) + item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.item_id)
          }
        }
      }
    }

    return {
      success: true,
      message: `Invoice ${invoice.document_number} cancelled and inventory reversed`,
      data: {
        invoice_id: invoice.id,
        action: 'cancelled_and_reversed'
      }
    }

  } catch (error) {
    console.error('Order cancellation error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Handle customer created/updated
async function handleCustomerCreated(integration, customerData) {
  try {
    const { customer } = customerData

    const result = await findOrCreateCustomer(integration.company_id, customer, true)

    return {
      success: true,
      message: `Customer ${result.action}: ${customer.name}`,
      data: {
        customer_id: result.id,
        action: result.action
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function handleCustomerUpdated(integration, customerData) {
  return await handleCustomerCreated(integration, customerData)
}

// Handle product updated
async function handleProductUpdated(integration, productData) {
  try {
    const { product } = productData

    // Find existing item
    const { data: existingItem } = await supabase
      .from('items')
      .select('*')
      .eq('company_id', integration.company_id)
      .eq('veekaart_product_id', product.id)
      .single()

    if (!existingItem) {
      return {
        success: false,
        error: `Product not found in EzBillify: ${product.id}`
      }
    }

    // Update item data
    const updateData = {
      item_name: product.name,
      description: product.description,
      selling_price: parseFloat(product.price) || existingItem.selling_price,
      category: product.category,
      is_active: product.status === 'active',
      veekaart_last_sync: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await supabase
      .from('items')
      .update(updateData)
      .eq('id', existingItem.id)

    return {
      success: true,
      message: `Product updated: ${product.name}`,
      data: { item_id: existingItem.id }
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Handle stock changes
async function handleStockChanged(integration, stockData) {
  try {
    const { product_id, new_stock, old_stock, reason } = stockData

    // Find item
    const { data: item } = await supabase
      .from('items')
      .select('*')
      .eq('company_id', integration.company_id)
      .eq('veekaart_product_id', product_id)
      .single()

    if (!item) {
      return {
        success: false,
        error: `Product not found: ${product_id}`
      }
    }

    // Create inventory adjustment
    const stockDifference = parseFloat(new_stock) - parseFloat(old_stock || 0)

    if (stockDifference !== 0) {
      await supabase
        .from('inventory_movements')
        .insert({
          company_id: integration.company_id,
          item_id: item.id,
          item_code: item.item_code,
          movement_type: 'adjustment',
          quantity: Math.abs(stockDifference),
          reference_type: 'veekaart_sync',
          reference_number: `VK-STOCK-${Date.now()}`,
          stock_before: item.current_stock,
          stock_after: parseFloat(new_stock),
          movement_date: new Date().toISOString().split('T')[0],
          notes: `VeeKaart stock adjustment: ${reason || 'Unknown reason'}`
        })

      // Update item stock
      await supabase
        .from('items')
        .update({
          current_stock: parseFloat(new_stock),
          available_stock: parseFloat(new_stock),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
    }

    return {
      success: true,
      message: `Stock updated for ${item.item_code}: ${old_stock} → ${new_stock}`,
      data: {
        item_id: item.id,
        old_stock,
        new_stock,
        difference: stockDifference
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Helper functions
async function findOrCreateCustomer(company_id, vkCustomer, forceUpdate = false) {
  // Try to find existing customer
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('company_id', company_id)
    .or(`email.eq.${vkCustomer.email},veekaart_customer_id.eq.${vkCustomer.id}`)
    .single()

  const customerData = {
    company_id,
    customer_code: vkCustomer.customer_code || `VK-${vkCustomer.id}`,
    customer_type: 'b2c',
    name: vkCustomer.name || `${vkCustomer.first_name || ''} ${vkCustomer.last_name || ''}`.trim(),
    email: vkCustomer.email,
    phone: vkCustomer.phone,
    mobile: vkCustomer.mobile || vkCustomer.phone,
    billing_address: vkCustomer.billing_address || {},
    shipping_address: vkCustomer.shipping_address || vkCustomer.billing_address || {},
    status: vkCustomer.status === 'active' ? 'active' : 'inactive',
    veekaart_customer_id: vkCustomer.id,
    veekaart_last_sync: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (customer && forceUpdate) {
    // Update existing customer
    await supabase
      .from('customers')
      .update(customerData)
      .eq('id', customer.id)
    
    return { ...customer, action: 'updated' }
  } else if (customer) {
    // Return existing customer
    return { ...customer, action: 'found' }
  } else {
    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single()

    if (error) throw error
    return { ...newCustomer, action: 'created' }
  }
}

async function notifyVeeKaartOfInvoice(integration, vkOrderId, invoiceData) {
  try {
    const apiConfig = integration.api_config || {}
    const response = await fetch(`${apiConfig.api_url}/api/orders/${vkOrderId}/invoice`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiConfig.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    })

    return {
      success: response.ok,
      status: response.status,
      data: response.ok ? await response.json() : null
    }
  } catch (error) {
    console.error('Failed to notify VeeKaart:', error)
    return {
      success: false,
      error: error.message
    }
  }
}