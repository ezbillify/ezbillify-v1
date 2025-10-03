// pages/api/webhooks/veekaart/orders.js
import { supabase } from '../../../../../../services/utils/supabase'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify API key from headers
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')
    const signature = req.headers['x-veekaart-signature']
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' })
    }

    // Find company by API key
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, webhook_secret')
      .eq('api_key', apiKey)
      .single()

    if (companyError || !company) {
      return res.status(401).json({ error: 'Invalid API key' })
    }

    // Verify webhook signature if present
    if (signature && company.webhook_secret) {
      const payload = JSON.stringify(req.body)
      const expectedSignature = crypto
        .createHmac('sha256', company.webhook_secret)
        .update(payload)
        .digest('hex')
      
      if (`sha256=${expectedSignature}` !== signature) {
        return res.status(401).json({ error: 'Invalid signature' })
      }
    }

    const orderData = req.body

    // Validate required fields
    if (!orderData.order_id || !orderData.customer || !orderData.items) {
      return res.status(400).json({ error: 'Missing required fields: order_id, customer, items' })
    }

    // Process customer first
    let customerId = null
    const customerData = orderData.customer

    if (customerData.email) {
      // Check if customer exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', company.id)
        .eq('email', customerData.email)
        .single()

      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        // Create new B2C customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            company_id: company.id,
            customer_code: `VK-${Date.now()}`,
            customer_type: 'b2c',
            name: customerData.name || customerData.email.split('@')[0],
            email: customerData.email,
            phone: customerData.phone || null,
            billing_address: {
              address_line_1: customerData.billing_address?.address_line_1 || '',
              address_line_2: customerData.billing_address?.address_line_2 || '',
              city: customerData.billing_address?.city || '',
              state: customerData.billing_address?.state || '',
              pincode: customerData.billing_address?.pincode || '',
              country: customerData.billing_address?.country || 'India'
            },
            shipping_address: customerData.shipping_address || customerData.billing_address || {},
            status: 'active',
            metadata: { source: 'veekaart', veekaart_customer_id: customerData.customer_id }
          })
          .select()
          .single()

        if (customerError) {
          console.error('Error creating customer:', customerError)
          return res.status(500).json({ error: 'Failed to create customer' })
        }
        customerId = newCustomer.id
      }
    }

    // Calculate totals
    let subtotal = 0
    let taxAmount = 0
    const processedItems = []

    for (const item of orderData.items) {
      const itemTotal = parseFloat(item.price) * parseFloat(item.quantity)
      const itemTax = itemTotal * (parseFloat(item.tax_rate || 0) / 100)
      
      subtotal += itemTotal
      taxAmount += itemTax

      // Find or create item in EzBillify
      let itemId = null
      if (item.sku) {
        const { data: existingItem } = await supabase
          .from('items')
          .select('id')
          .eq('company_id', company.id)
          .eq('item_code', item.sku)
          .single()

        if (existingItem) {
          itemId = existingItem.id
        } else {
          // Create new item
          const { data: newItem } = await supabase
            .from('items')
            .insert({
              company_id: company.id,
              item_code: item.sku,
              item_name: item.name,
              selling_price: parseFloat(item.price),
              item_type: 'product',
              is_active: true,
              track_inventory: true,
              metadata: { source: 'veekaart' }
            })
            .select()
            .single()

          if (newItem) itemId = newItem.id
        }
      }

      processedItems.push({
        item_id: itemId,
        item_code: item.sku || `VK-${item.product_id}`,
        item_name: item.name,
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.price),
        discount_amount: parseFloat(item.discount_amount || 0),
        taxable_amount: itemTotal - parseFloat(item.discount_amount || 0),
        tax_rate: parseFloat(item.tax_rate || 0),
        igst_rate: parseFloat(item.tax_rate || 0), // Assuming IGST for online orders
        igst_amount: itemTax,
        total_amount: itemTotal + itemTax,
        hsn_sac_code: item.hsn_code || null
      })
    }

    const totalAmount = subtotal + taxAmount - parseFloat(orderData.discount_amount || 0)

    // Create sales invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('sales_documents')
      .insert({
        company_id: company.id,
        document_type: 'invoice',
        customer_id: customerId,
        customer_name: customerData.name || customerData.email,
        document_date: new Date(orderData.order_date || Date.now()).toISOString().split('T')[0],
        subtotal: subtotal,
        discount_amount: parseFloat(orderData.discount_amount || 0),
        tax_amount: taxAmount,
        igst_amount: taxAmount,
        total_amount: totalAmount,
        status: 'confirmed',
        payment_status: orderData.payment_status === 'paid' ? 'paid' : 'unpaid',
        paid_amount: orderData.payment_status === 'paid' ? totalAmount : 0,
        balance_amount: orderData.payment_status === 'paid' ? 0 : totalAmount,
        notes: `VeeKaart Order: ${orderData.order_id}`,
        currency: orderData.currency || 'INR',
        billing_address: customerData.billing_address || {},
        shipping_address: customerData.shipping_address || customerData.billing_address || {},
        metadata: {
          source: 'veekaart',
          veekaart_order_id: orderData.order_id,
          payment_method: orderData.payment_method
        }
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError)
      return res.status(500).json({ error: 'Failed to create invoice' })
    }

    // Create invoice items
    const invoiceItems = processedItems.map(item => ({
      ...item,
      document_id: invoice.id
    }))

    const { error: itemsError } = await supabase
      .from('sales_document_items')
      .insert(invoiceItems)

    if (itemsError) {
      console.error('Error creating invoice items:', itemsError)
      return res.status(500).json({ error: 'Failed to create invoice items' })
    }

    // Update inventory for tracked items
    for (const item of processedItems) {
      if (item.item_id) {
        await supabase
          .from('inventory_movements')
          .insert({
            company_id: company.id,
            item_id: item.item_id,
            item_code: item.item_code,
            movement_type: 'out',
            quantity: item.quantity,
            rate: item.rate,
            value: item.quantity * item.rate,
            reference_type: 'sales_invoice',
            reference_id: invoice.id,
            reference_number: invoice.document_number,
            notes: `Sale via VeeKaart order ${orderData.order_id}`,
            movement_date: invoice.document_date
          })
      }
    }

    // Create payment record if order is paid
    if (orderData.payment_status === 'paid' && orderData.payment_method) {
      await supabase
        .from('payments')
        .insert({
          company_id: company.id,
          payment_type: 'received',
          payment_date: new Date(orderData.payment_date || Date.now()).toISOString().split('T')[0],
          amount: totalAmount,
          customer_id: customerId,
          party_name: customerData.name || customerData.email,
          payment_method: orderData.payment_method,
          reference_number: orderData.payment_reference || orderData.order_id,
          notes: `Payment for VeeKaart order ${orderData.order_id}`,
          status: 'completed'
        })
    }

    // Log successful webhook processing
    await supabase
      .from('webhook_events')
      .insert({
        company_id: company.id,
        event_type: 'veekaart.order.received',
        event_data: orderData,
        status: 'processed',
        response_status: 200,
        sent_at: new Date().toISOString()
      })

    return res.status(200).json({
      success: true,
      message: 'Order processed successfully',
      invoice_id: invoice.id,
      invoice_number: invoice.document_number
    })

  } catch (error) {
    console.error('VeeKaart order webhook error:', error)
    
    // Log failed webhook
    if (req.body && company?.id) {
      await supabase
        .from('webhook_events')
        .insert({
          company_id: company.id,
          event_type: 'veekaart.order.received',
          event_data: req.body,
          status: 'failed',
          error_message: error.message,
          response_status: 500,
          sent_at: new Date().toISOString()
        })
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}