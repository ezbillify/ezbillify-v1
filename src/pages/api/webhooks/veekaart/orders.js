// pages/api/webhooks/veekaart/orders.js
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS policies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // Extract API Key from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header'
      })
    }

    const api_key = authHeader.replace('Bearer ', '')

    // Find company by API key
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('api_key', api_key)
      .single()

    if (companyError || !company) {
      console.error('Company lookup error:', companyError)
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      })
    }

    // Extract order data from request body
    const {
      order_id,
      order_date,
      customer,
      items,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      payment_method,
      payment_status
    } = req.body

    // Validate required fields
    if (!order_id || !customer || !items || items.length === 0 || !total_amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: order_id, customer, items, total_amount'
      })
    }

    // Find or create customer in Ezbillify
    const { data: ezCustomer, error: customerError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('company_id', company.id)
      .eq('email', customer.email)
      .single()

    if (customerError && customerError.code !== 'PGRST116') {
      console.error('Error finding customer:', customerError)
      throw customerError
    }

    let customer_id
    let customer_name
    if (ezCustomer) {
      customer_id = ezCustomer.id
      customer_name = ezCustomer.name
    } else {
      // Create customer if doesn't exist
      const { data: newCustomer, error: createCustomerError } = await supabase
        .from('customers')
        .insert({
          company_id: company.id,
          customer_type: 'b2c',
          customer_code: `VK-${customer.id}`,
          name: customer.name,
          email: customer.email,
          phone: customer.phone || null,
          billing_address: customer.billing_address || {},
          shipping_address: customer.shipping_address || {},
          status: 'active',
          metadata: {
            veekaart_customer_id: customer.id,
            synced_at: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        })
        .select('id, name')
        .single()

      if (createCustomerError) {
        console.error('Error creating customer:', createCustomerError)
        throw createCustomerError
      }

      customer_id = newCustomer.id
      customer_name = newCustomer.name
    }

    // Create sales document (invoice)
    const salesDocData = {
      company_id: company.id,
      document_type: 'invoice',
      document_date: order_date ? new Date(order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      reference_number: order_id,
      customer_id: customer_id,
      customer_name: customer_name,
      customer_gstin: customer.gstin || null,
      billing_address: customer.billing_address || {},
      shipping_address: customer.shipping_address || {},
      subtotal: parseFloat(subtotal) || 0,
      discount_amount: parseFloat(discount_amount) || 0,
      tax_amount: parseFloat(tax_amount) || 0,
      total_amount: parseFloat(total_amount),
      paid_amount: payment_status === 'paid' ? parseFloat(total_amount) : 0,
      balance_amount: payment_status === 'paid' ? 0 : parseFloat(total_amount),
      status: 'draft',
      payment_status: payment_status || 'unpaid',
      notes: `Payment Method: ${payment_method || 'COD'}\nVeekaart Order ID: ${order_id}`,
      created_at: new Date().toISOString()
    }

    const { data: salesDoc, error: docError } = await supabase
      .from('sales_documents')
      .insert(salesDocData)
      .select('id, document_number')
      .single()

    if (docError) {
      console.error('Error creating sales document:', docError)
      throw docError
    }

    // Create sales document items
    const docItems = items.map((item, index) => ({
      document_id: salesDoc.id,
      item_code: item.sku || `ITEM-${index}`,
      item_name: item.name,
      description: item.description || null,
      quantity: parseFloat(item.quantity) || 1,
      unit_name: item.unit || 'Pcs',
      rate: parseFloat(item.price) || 0,
      tax_rate: parseFloat(item.tax_rate) || 0,
      igst_rate: parseFloat(item.tax_rate) || 0,
      taxable_amount: parseFloat(item.quantity) * parseFloat(item.price),
      igst_amount: (parseFloat(item.quantity) * parseFloat(item.price) * parseFloat(item.tax_rate)) / 100,
      total_amount: parseFloat(item.quantity) * parseFloat(item.price) + (parseFloat(item.quantity) * parseFloat(item.price) * parseFloat(item.tax_rate)) / 100,
      hsn_sac_code: item.hsn_code || null,
      created_at: new Date().toISOString()
    }))

    const { error: itemsError } = await supabase
      .from('sales_document_items')
      .insert(docItems)

    if (itemsError) {
      console.error('Error creating sales document items:', itemsError)
      throw itemsError
    }

    return res.status(200).json({
      success: true,
      message: 'Order received and invoice created',
      data: {
        document_id: salesDoc.id,
        document_number: salesDoc.document_number,
        order_id: order_id,
        customer_id: customer_id,
        items_count: items.length,
        total_amount: total_amount
      }
    })

  } catch (error) {
    console.error('Error in orders webhook:', error.message, error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    })
  }
}