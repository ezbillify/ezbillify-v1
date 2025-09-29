// pages/api/webhooks/veekaart/customers.js
import { supabase } from '../../../../services/utils/supabase'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify API key
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

    const customerData = req.body
    const eventType = customerData.event_type // 'created', 'updated', 'deleted'

    // Validate required fields
    if (!customerData.customer_id || !customerData.email) {
      return res.status(400).json({ error: 'Missing required fields: customer_id, email' })
    }

    let result = null

    switch (eventType) {
      case 'created':
      case 'updated':
        result = await upsertCustomer(company.id, customerData)
        break
      case 'deleted':
        result = await deactivateCustomer(company.id, customerData.customer_id)
        break
      default:
        return res.status(400).json({ error: 'Invalid event type' })
    }

    if (result.error) {
      throw new Error(result.error)
    }

    // Log successful webhook processing
    await supabase
      .from('webhook_events')
      .insert({
        company_id: company.id,
        event_type: `veekaart.customer.${eventType}`,
        event_data: customerData,
        status: 'processed',
        response_status: 200,
        sent_at: new Date().toISOString()
      })

    return res.status(200).json({
      success: true,
      message: `Customer ${eventType} successfully`,
      customer_id: result.customer?.id
    })

  } catch (error) {
    console.error('VeeKaart customer webhook error:', error)
    
    // Log failed webhook
    if (req.body && company?.id) {
      await supabase
        .from('webhook_events')
        .insert({
          company_id: company.id,
          event_type: `veekaart.customer.${req.body.event_type || 'unknown'}`,
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

async function upsertCustomer(companyId, customerData) {
  try {
    // Check if customer already exists by email or VeeKaart customer ID
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .or(`email.eq.${customerData.email},metadata->>veekaart_customer_id.eq.${customerData.customer_id}`)
      .single()

    const customerRecord = {
      company_id: companyId,
      customer_code: existingCustomer?.customer_code || `VK-${customerData.customer_id}`,
      customer_type: 'b2c',
      name: customerData.name || customerData.first_name + ' ' + (customerData.last_name || ''),
      display_name: customerData.display_name || customerData.name,
      email: customerData.email,
      phone: customerData.phone || customerData.mobile,
      mobile: customerData.mobile || customerData.phone,
      
      // Billing Address
      billing_address: {
        address_line_1: customerData.billing_address?.address_line_1 || customerData.address?.street || '',
        address_line_2: customerData.billing_address?.address_line_2 || customerData.address?.apartment || '',
        city: customerData.billing_address?.city || customerData.address?.city || '',
        state: customerData.billing_address?.state || customerData.address?.state || '',
        pincode: customerData.billing_address?.pincode || customerData.address?.zip || '',
        country: customerData.billing_address?.country || customerData.address?.country || 'India'
      },
      
      // Shipping Address (if provided, otherwise same as billing)
      shipping_address: customerData.shipping_address || customerData.billing_address || {
        address_line_1: customerData.address?.street || '',
        address_line_2: customerData.address?.apartment || '',
        city: customerData.address?.city || '',
        state: customerData.address?.state || '',
        pincode: customerData.address?.zip || '',
        country: customerData.address?.country || 'India'
      },
      
      // Business details (for B2B customers if applicable)
      company_name: customerData.company_name || null,
      gstin: customerData.gstin || null,
      
      // Preferences
      tax_preference: customerData.tax_preference || 'taxable',
      payment_terms: customerData.payment_terms || 0,
      
      // Status and metadata
      status: customerData.status === 'inactive' ? 'inactive' : 'active',
      notes: customerData.notes || null,
      metadata: {
        source: 'veekaart',
        veekaart_customer_id: customerData.customer_id,
        date_of_birth: customerData.date_of_birth,
        gender: customerData.gender,
        preferences: customerData.preferences || {},
        last_synced: new Date().toISOString()
      },
      
      updated_at: new Date().toISOString()
    }

    let customer
    if (existingCustomer) {
      // Update existing customer
      const { data, error } = await supabase
        .from('customers')
        .update(customerRecord)
        .eq('id', existingCustomer.id)
        .select()
        .single()
      
      if (error) throw error
      customer = data
    } else {
      // Create new customer
      customerRecord.created_at = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('customers')
        .insert(customerRecord)
        .select()
        .single()
      
      if (error) throw error
      customer = data
    }

    return { customer }

  } catch (error) {
    console.error('Error upserting customer:', error)
    return { error: error.message }
  }
}

async function deactivateCustomer(companyId, veekaartCustomerId) {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
        metadata: supabase.raw(`metadata || '{"deactivated_from_veekaart": true, "deactivated_at": "${new Date().toISOString()}"}'::jsonb`)
      })
      .eq('company_id', companyId)
      .eq('metadata->>veekaart_customer_id', veekaartCustomerId)
      .select()
      .single()

    if (error) throw error
    
    return { customer }

  } catch (error) {
    console.error('Error deactivating customer:', error)
    return { error: error.message }
  }
}