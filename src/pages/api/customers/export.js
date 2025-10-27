// pages/api/customers/export.js
import { withAuth } from '../../../lib/middleware'
import { supabaseAdmin } from '../../../services/utils/supabase'
import { stringify } from 'csv-stringify/sync'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Fetch all customers for the company
    const { data: customers, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('company_id', company_id)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    // Transform customer data for export
    const exportData = customers.map(customer => ({
      customer_code: customer.customer_code || '',
      customer_type: customer.customer_type || '',
      name: customer.name || '',
      company_name: customer.company_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      mobile: customer.mobile || '',
      designation: customer.designation || '',
      gstin: customer.gstin || '',
      pan: customer.pan || '',
      business_type: customer.business_type || '',
      tax_preference: customer.tax_preference || '',
      credit_limit: customer.credit_limit || 0,
      payment_terms: customer.payment_terms || 0,
      opening_balance: customer.opening_balance || 0,
      opening_balance_type: customer.opening_balance_type || '',
      billing_address: customer.billing_address ? JSON.stringify(customer.billing_address) : '',
      shipping_address: customer.shipping_address ? JSON.stringify(customer.shipping_address) : '',
      same_as_billing: customer.same_as_billing ? 'true' : 'false',
      notes: customer.notes || '',
      status: customer.status || '',
      created_at: customer.created_at || '',
      updated_at: customer.updated_at || ''
    }))

    // Convert to CSV
    const csv = stringify(exportData, {
      header: true,
      columns: [
        'customer_code',
        'customer_type',
        'name',
        'company_name',
        'email',
        'phone',
        'mobile',
        'designation',
        'gstin',
        'pan',
        'business_type',
        'tax_preference',
        'credit_limit',
        'payment_terms',
        'opening_balance',
        'opening_balance_type',
        'billing_address',
        'shipping_address',
        'same_as_billing',
        'notes',
        'status',
        'created_at',
        'updated_at'
      ]
    })

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="customers_${new Date().toISOString().split('T')[0]}.csv"`)

    // Send CSV data
    return res.status(200).send(csv)
  } catch (error) {
    console.error('Customer export error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to export customers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)