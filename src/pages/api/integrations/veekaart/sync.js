// pages/api/integrations/veekaart/sync.js
import { supabase } from '../../../../lib/supabase'
import { withAuth } from '../../../../lib/middleware/auth'
import { generateNextDocumentNumber } from '../../settings/document-numbering'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'POST':
        return await handleSync(req, res)
      case 'GET':
        return await getSyncStatus(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('VeeKaart sync API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function handleSync(req, res) {
  const { company_id, sync_type, manual = false } = req.body

  if (!company_id || !sync_type) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and sync type are required'
    })
  }

  // Check if VeeKaart integration is active
  const { data: integration, error: integrationError } = await supabase
    .from('integrations')
    .select('*')
    .eq('company_id', company_id)
    .eq('integration_type', 'veekaart')
    .eq('is_active', true)
    .single()

  if (integrationError || !integration) {
    return res.status(400).json({
      success: false,
      error: 'VeeKaart integration not found or inactive'
    })
  }

  // Create sync record
  const syncRecord = {
    company_id,
    integration_id: integration.id,
    sync_type,
    status: 'running',
    manual,
    started_at: new Date().toISOString(),
    records_processed: 0,
    errors: 0
  }

  const { data: syncLog, error: logError } = await supabase
    .from('sync_logs')
    .insert(syncRecord)
    .select()
    .single()

  if (logError) {
    console.error('Error creating sync log:', logError)
    return res.status(500).json({
      success: false,
      error: 'Failed to create sync log'
    })
  }

  // Process sync in background
  processSyncInBackground(syncLog.id, integration, sync_type)

  return res.status(200).json({
    success: true,
    message: `${sync_type} sync started`,
    sync_id: syncLog.id
  })
}

async function getSyncStatus(req, res) {
  const { company_id, sync_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  let query = supabase
    .from('sync_logs')
    .select('*')
    .eq('company_id', company_id)
    .order('started_at', { ascending: false })

  if (sync_id) {
    query = query.eq('id', sync_id).single()
  } else {
    query = query.limit(10)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching sync status:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sync status'
    })
  }

  return res.status(200).json({
    success: true,
    data
  })
}

// Background sync processing
async function processSyncInBackground(syncLogId, integration, syncType) {
  try {
    let result
    
    switch (syncType) {
      case 'products':
        result = await syncProducts(integration)
        break
      case 'customers':
        result = await syncCustomers(integration)
        break
      case 'orders':
        result = await syncOrders(integration)
        break
      case 'inventory':
        result = await syncInventory(integration)
        break
      default:
        throw new Error(`Unknown sync type: ${syncType}`)
    }

    // Update sync log with success
    await supabase
      .from('sync_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_processed: result.processed,
        errors: result.errors,
        duration: Math.floor((Date.now() - new Date(syncLogId).getTime()) / 1000),
        result_summary: result.summary
      })
      .eq('id', syncLogId)

  } catch (error) {
    console.error(`Sync ${syncType} failed:`, error)
    
    // Update sync log with error
    await supabase
      .from('sync_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message,
        duration: Math.floor((Date.now() - new Date(syncLogId).getTime()) / 1000)
      })
      .eq('id', syncLogId)
  }
}

// Product sync from VeeKaart to EzBillify
async function syncProducts(integration) {
  const veekaartProducts = await fetchFromVeeKaart(integration, '/api/products')
  let processed = 0
  let errors = 0
  const summary = []

  for (const vkProduct of veekaartProducts) {
    try {
      // Check if product exists in EzBillify
      const { data: existingItem } = await supabase
        .from('items')
        .select('id')
        .eq('company_id', integration.company_id)
        .eq('veekaart_product_id', vkProduct.id)
        .single()

      const itemData = {
        company_id: integration.company_id,
        item_code: vkProduct.sku || `VK-${vkProduct.id}`,
        item_name: vkProduct.name,
        description: vkProduct.description,
        selling_price: parseFloat(vkProduct.price) || 0,
        item_type: 'product',
        category: vkProduct.category,
        hsn_sac_code: vkProduct.hsn_code,
        track_inventory: true,
        current_stock: parseFloat(vkProduct.stock_quantity) || 0,
        available_stock: parseFloat(vkProduct.stock_quantity) || 0,
        is_active: vkProduct.status === 'active',
        veekaart_product_id: vkProduct.id,
        veekaart_last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (existingItem) {
        // Update existing item
        await supabase
          .from('items')
          .update(itemData)
          .eq('id', existingItem.id)
        
        summary.push(`Updated: ${vkProduct.name}`)
      } else {
        // Create new item
        await supabase
          .from('items')
          .insert(itemData)
        
        summary.push(`Created: ${vkProduct.name}`)
      }

      processed++
    } catch (error) {
      console.error(`Error syncing product ${vkProduct.id}:`, error)
      errors++
      summary.push(`Error: ${vkProduct.name} - ${error.message}`)
    }
  }

  return {
    processed,
    errors,
    summary: summary.slice(0, 10) // Limit summary to prevent large data
  }
}

// Customer sync from VeeKaart to EzBillify
async function syncCustomers(integration) {
  const veekaartCustomers = await fetchFromVeeKaart(integration, '/api/customers')
  let processed = 0
  let errors = 0
  const summary = []

  for (const vkCustomer of veekaartCustomers) {
    try {
      // Check if customer exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', integration.company_id)
        .eq('veekaart_customer_id', vkCustomer.id)
        .single()

      const customerData = {
        company_id: integration.company_id,
        customer_code: vkCustomer.customer_code || `VK-${vkCustomer.id}`,
        customer_type: 'b2c',
        name: vkCustomer.name || `${vkCustomer.first_name} ${vkCustomer.last_name}`.trim(),
        email: vkCustomer.email,
        phone: vkCustomer.phone,
        mobile: vkCustomer.mobile || vkCustomer.phone,
        billing_address: {
          address_line_1: vkCustomer.billing_address?.address_line_1,
          address_line_2: vkCustomer.billing_address?.address_line_2,
          city: vkCustomer.billing_address?.city,
          state: vkCustomer.billing_address?.state,
          pincode: vkCustomer.billing_address?.pincode,
          country: vkCustomer.billing_address?.country || 'India'
        },
        shipping_address: vkCustomer.shipping_address || vkCustomer.billing_address,
        status: vkCustomer.status === 'active' ? 'active' : 'inactive',
        veekaart_customer_id: vkCustomer.id,
        veekaart_last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (existingCustomer) {
        await supabase
          .from('customers')
          .update(customerData)
          .eq('id', existingCustomer.id)
        
        summary.push(`Updated: ${customerData.name}`)
      } else {
        await supabase
          .from('customers')
          .insert(customerData)
        
        summary.push(`Created: ${customerData.name}`)
      }

      processed++
    } catch (error) {
      console.error(`Error syncing customer ${vkCustomer.id}:`, error)
      errors++
      summary.push(`Error: ${vkCustomer.name} - ${error.message}`)
    }
  }

  return { processed, errors, summary: summary.slice(0, 10) }
}

// Order sync from VeeKaart to EzBillify (creates invoices)
async function syncOrders(integration) {
  const veekaartOrders = await fetchFromVeeKaart(integration, '/api/orders?status=confirmed')
  let processed = 0
  let errors = 0
  const summary = []

  for (const vkOrder of veekaartOrders) {
    try {
      // Check if order already processed
      const { data: existingInvoice } = await supabase
        .from('sales_documents')
        .select('id, document_number')
        .eq('company_id', integration.company_id)
        .eq('document_type', 'invoice')
        .eq('veekaart_order_id', vkOrder.id)
        .single()

      if (existingInvoice) {
        summary.push(`Skipped: Order ${vkOrder.order_number} already processed as ${existingInvoice.document_number}`)
        continue
      }

      // Get or create customer
      let customer = await findOrCreateCustomer(integration.company_id, vkOrder.customer)

      // Generate invoice number
      const { document_number } = await generateNextDocumentNumber(integration.company_id, 'invoice')

      // Create invoice
      const invoiceData = {
        company_id: integration.company_id,
        document_type: 'invoice',
        document_number,
        document_date: vkOrder.order_date,
        customer_id: customer.id,
        customer_name: customer.name,
        billing_address: vkOrder.billing_address,
        shipping_address: vkOrder.shipping_address,
        subtotal: parseFloat(vkOrder.subtotal) || 0,
        tax_amount: parseFloat(vkOrder.tax_amount) || 0,
        total_amount: parseFloat(vkOrder.total_amount) || 0,
        status: 'confirmed',
        payment_status: vkOrder.payment_status || 'unpaid',
        veekaart_order_id: vkOrder.id,
        veekaart_order_number: vkOrder.order_number,
        created_at: new Date().toISOString()
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('sales_documents')
        .insert(invoiceData)
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create invoice items and update inventory
      for (const orderItem of vkOrder.items) {
        // Create invoice item
        await supabase
          .from('sales_document_items')
          .insert({
            document_id: invoice.id,
            item_code: orderItem.sku,
            item_name: orderItem.name,
            quantity: parseFloat(orderItem.quantity),
            rate: parseFloat(orderItem.price),
            taxable_amount: parseFloat(orderItem.line_total),
            total_amount: parseFloat(orderItem.line_total)
          })

        // Update inventory
        await updateInventory(integration.company_id, orderItem.product_id, -orderItem.quantity, {
          reference_type: 'sales_document',
          reference_id: invoice.id,
          reference_number: document_number
        })
      }

      // Send invoice details back to VeeKaart
      await notifyVeeKaartOfInvoice(integration, vkOrder.id, {
        invoice_id: invoice.id,
        invoice_number: document_number,
        invoice_amount: invoiceData.total_amount,
        invoice_status: 'generated'
      })

      processed++
      summary.push(`Created invoice ${document_number} for order ${vkOrder.order_number}`)

    } catch (error) {
      console.error(`Error processing order ${vkOrder.id}:`, error)
      errors++
      summary.push(`Error: Order ${vkOrder.order_number} - ${error.message}`)
    }
  }

  return { processed, errors, summary: summary.slice(0, 10) }
}

// Inventory sync from EzBillify to VeeKaart
async function syncInventory(integration) {
  const { data: items, error } = await supabase
    .from('items')
    .select('id, item_code, current_stock, veekaart_product_id')
    .eq('company_id', integration.company_id)
    .not('veekaart_product_id', 'is', null)

  if (error) throw error

  let processed = 0
  let errors = 0
  const summary = []

  for (const item of items) {
    try {
      // Send stock update to VeeKaart
      await sendToVeeKaart(integration, '/api/products/stock', 'PUT', {
        product_id: item.veekaart_product_id,
        stock_quantity: item.current_stock,
        updated_by: 'ezbillify'
      })

      processed++
      summary.push(`Updated stock for ${item.item_code}: ${item.current_stock}`)
    } catch (error) {
      console.error(`Error updating inventory for ${item.item_code}:`, error)
      errors++
      summary.push(`Error: ${item.item_code} - ${error.message}`)
    }
  }

  return { processed, errors, summary: summary.slice(0, 10) }
}

// Helper functions
async function fetchFromVeeKaart(integration, endpoint) {
  const apiConfig = integration.api_config || {}
  const response = await fetch(`${apiConfig.api_url}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiConfig.api_key}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`VeeKaart API error: ${response.status}`)
  }

  const data = await response.json()
  return data.data || data
}

async function sendToVeeKaart(integration, endpoint, method = 'POST', body = null) {
  const apiConfig = integration.api_config || {}
  const response = await fetch(`${apiConfig.api_url}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiConfig.api_key}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  })

  if (!response.ok) {
    throw new Error(`VeeKaart API error: ${response.status}`)
  }

  return response.json()
}

async function findOrCreateCustomer(company_id, vkCustomer) {
  // Try to find existing customer
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('company_id', company_id)
    .or(`email.eq.${vkCustomer.email},veekaart_customer_id.eq.${vkCustomer.id}`)
    .single()

  if (!customer) {
    // Create new customer
    const customerData = {
      company_id,
      customer_code: `VK-${vkCustomer.id}`,
      customer_type: 'b2c',
      name: vkCustomer.name,
      email: vkCustomer.email,
      phone: vkCustomer.phone,
      billing_address: vkCustomer.billing_address,
      shipping_address: vkCustomer.shipping_address,
      veekaart_customer_id: vkCustomer.id,
      created_at: new Date().toISOString()
    }

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single()

    if (error) throw error
    customer = newCustomer
  }

  return customer
}

async function updateInventory(company_id, product_id, quantity_change, reference) {
  // Find item by VeeKaart product ID
  const { data: item } = await supabase
    .from('items')
    .select('*')
    .eq('company_id', company_id)
    .eq('veekaart_product_id', product_id)
    .single()

  if (!item) return

  // Create inventory movement
  await supabase
    .from('inventory_movements')
    .insert({
      company_id,
      item_id: item.id,
      item_code: item.item_code,
      movement_type: quantity_change > 0 ? 'in' : 'out',
      quantity: Math.abs(quantity_change),
      reference_type: reference.reference_type,
      reference_id: reference.reference_id,
      reference_number: reference.reference_number,
      stock_before: item.current_stock,
      stock_after: item.current_stock + quantity_change,
      movement_date: new Date().toISOString().split('T')[0]
    })

  // Update item stock
  await supabase
    .from('items')
    .update({
      current_stock: item.current_stock + quantity_change,
      available_stock: item.current_stock + quantity_change,
      updated_at: new Date().toISOString()
    })
    .eq('id', item.id)
}

async function notifyVeeKaartOfInvoice(integration, vkOrderId, invoiceData) {
  try {
    await sendToVeeKaart(integration, `/api/orders/${vkOrderId}/invoice`, 'PUT', invoiceData)
  } catch (error) {
    console.error('Failed to notify VeeKaart of invoice:', error)
    // Don't fail the sync for notification errors
  }
}

export default withAuth(handler)