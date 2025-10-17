// pages/api/webhooks/veekaart/customers.js
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

    // Extract customer data from request body
    const {
      id: veekaart_customer_id,
      name,
      email,
      phone,
      billing_address,
      shipping_address
    } = req.body

    // Validate required fields
    if (!veekaart_customer_id || !name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, name, email'
      })
    }

    // Check if customer already exists by email
    const { data: existingCustomer, error: existingError } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', company.id)
      .eq('email', email)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing customer:', existingError)
      throw existingError
    }

    let customer
    let action = 'created'

    if (existingCustomer) {
      // Update existing customer
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({
          name,
          email,
          phone: phone || null,
          billing_address: billing_address || {},
          shipping_address: shipping_address || {},
          metadata: {
            veekaart_customer_id: veekaart_customer_id,
            synced_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCustomer.id)
        .select()
        .single()

      if (updateError) {
        console.error('Update customer error:', updateError)
        throw updateError
      }

      customer = updatedCustomer
      action = 'updated'
    } else {
      // Create new customer
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          company_id: company.id,
          customer_type: 'b2c',
          customer_code: `VK-${veekaart_customer_id}`,
          name,
          email,
          phone: phone || null,
          billing_address: billing_address || {},
          shipping_address: shipping_address || {},
          status: 'active',
          metadata: {
            veekaart_customer_id: veekaart_customer_id,
            synced_at: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Create customer error:', createError)
        throw createError
      }

      customer = newCustomer
    }

    return res.status(200).json({
      success: true,
      message: `Customer ${action} successfully`,
      data: {
        customer_id: customer.id,
        veekaart_customer_id,
        action
      }
    })

  } catch (error) {
    console.error('Error in webhook receiver:', error.message, error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    })
  }
}