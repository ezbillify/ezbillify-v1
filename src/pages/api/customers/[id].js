// pages/api/customers/[id].js
import { supabase } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Customer ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getCustomer(req, res, id)
      case 'PUT':
        return await updateCustomer(req, res, id)
      case 'DELETE':
        return await deleteCustomer(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Customer API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getCustomer(req, res, customerId) {
  const { company_id, include_stats = false } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Base customer query
  let customerQuery = supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('company_id', company_id)
    .single()

  const { data: customer, error } = await customerQuery

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      })
    }
    
    console.error('Error fetching customer:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer'
    })
  }

  let customerData = customer

  // Include customer statistics if requested
  if (include_stats === 'true') {
    const stats = await getCustomerStatistics(customerId, company_id)
    customerData = {
      ...customer,
      stats
    }
  }

  return res.status(200).json({
    success: true,
    data: customerData
  })
}

async function updateCustomer(req, res, customerId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if customer exists
  const { data: existingCustomer, error: fetchError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('company_id', company_id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer'
    })
  }

  // Validate email format if provided
  if (req.body.email && !isValidEmail(req.body.email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    })
  }

  // Validate GSTIN format if provided
  if (req.body.gstin && !isValidGSTIN(req.body.gstin)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid GSTIN format'
    })
  }

  // Validate PAN format if provided
  if (req.body.pan && !isValidPAN(req.body.pan)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid PAN format'
    })
  }

  // Check for duplicate email or GSTIN (excluding current customer)
  if (req.body.email || req.body.gstin) {
    const conditions = []
    if (req.body.email) conditions.push(`email.eq.${req.body.email}`)
    if (req.body.gstin) conditions.push(`gstin.eq.${req.body.gstin}`)

    if (conditions.length > 0) {
      const { data: duplicates } = await supabase
        .from('customers')
        .select('id, email, gstin')
        .eq('company_id', company_id)
        .neq('id', customerId)
        .or(conditions.join(','))
      
      if (duplicates && duplicates.length > 0) {
        const duplicate = duplicates[0]
        if (duplicate.email === req.body.email) {
          return res.status(400).json({
            success: false,
            error: 'Another customer with this email already exists'
          })
        }
        if (duplicate.gstin === req.body.gstin) {
          return res.status(400).json({
            success: false,
            error: 'Another customer with this GSTIN already exists'
          })
        }
      }
    }
  }

  // Prepare update data
  const allowedFields = [
    'name', 'display_name', 'email', 'phone', 'mobile', 'website',
    'company_name', 'contact_person', 'designation', 'gstin', 'pan', 'business_type',
    'billing_address', 'shipping_address', 'credit_limit', 'payment_terms', 
    'price_list_id', 'tax_preference', 'tags', 'notes', 'status'
  ]

  const updateData = {}
  
  allowedFields.forEach(field => {
    if (req.body.hasOwnProperty(field)) {
      let value = req.body[field]
      
      // Type-specific processing
      if (field === 'email' && value) {
        value = value.toLowerCase().trim()
      } else if (['name', 'display_name', 'company_name', 'contact_person', 'designation', 'notes'].includes(field) && value) {
        value = value.trim()
      } else if (['gstin', 'pan'].includes(field) && value) {
        value = value.toUpperCase().trim()
      } else if (['credit_limit'].includes(field)) {
        value = parseFloat(value) || 0
      } else if (['payment_terms'].includes(field)) {
        value = parseInt(value) || 0
      }
      
      updateData[field] = value
    }
  })

  // Add timestamp
  updateData.updated_at = new Date().toISOString()

  // If this is a VeeKaart customer update, update sync timestamp
  if (existingCustomer.veekaart_customer_id) {
    updateData.veekaart_last_sync = new Date().toISOString()
  }

  const { data: updatedCustomer, error: updateError } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', customerId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating customer:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update customer'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Customer updated successfully',
    data: updatedCustomer
  })
}

async function deleteCustomer(req, res, customerId) {
  const { company_id, force = false } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if customer exists
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('id, name')
    .eq('id', customerId)
    .eq('company_id', company_id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer'
    })
  }

  // Check if customer has related transactions (unless forced)
  if (!force) {
    const { data: transactions, error: transError } = await supabase
      .from('sales_documents')
      .select('id')
      .eq('customer_id', customerId)
      .limit(1)

    if (transError) {
      console.error('Error checking transactions:', transError)
      return res.status(500).json({
        success: false,
        error: 'Failed to check customer transactions'
      })
    }

    if (transactions && transactions.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete customer with existing transactions. Use force=true to override.',
        has_transactions: true
      })
    }
  }

  // Soft delete (mark as inactive) rather than hard delete
  const { error: deleteError } = await supabase
    .from('customers')
    .update({
      status: 'deleted',
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', customerId)

  if (deleteError) {
    console.error('Error deleting customer:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete customer'
    })
  }

  return res.status(200).json({
    success: true,
    message: `Customer "${customer.name}" deleted successfully`
  })
}

async function getCustomerStatistics(customerId, companyId) {
  try {
    // Get customer statistics
    const [salesStats, paymentStats, recentActivity] = await Promise.all([
      getCustomerSalesStats(customerId),
      getCustomerPaymentStats(customerId),
      getCustomerRecentActivity(customerId, 5)
    ])

    return {
      sales: salesStats,
      payments: paymentStats,
      recent_activity: recentActivity
    }
  } catch (error) {
    console.error('Error fetching customer statistics:', error)
    return null
  }
}

async function getCustomerSalesStats(customerId) {
  const { data: salesData } = await supabase
    .from('sales_documents')
    .select('total_amount, paid_amount, status, document_date')
    .eq('customer_id', customerId)
    .eq('document_type', 'invoice')

  if (!salesData) return null

  const totalInvoices = salesData.length
  const totalAmount = salesData.reduce((sum, doc) => sum + (parseFloat(doc.total_amount) || 0), 0)
  const totalPaid = salesData.reduce((sum, doc) => sum + (parseFloat(doc.paid_amount) || 0), 0)
  const totalOutstanding = totalAmount - totalPaid

  // Calculate this year's sales
  const currentYear = new Date().getFullYear()
  const thisYearSales = salesData
    .filter(doc => new Date(doc.document_date).getFullYear() === currentYear)
    .reduce((sum, doc) => sum + (parseFloat(doc.total_amount) || 0), 0)

  return {
    total_invoices: totalInvoices,
    total_amount: totalAmount,
    total_paid: totalPaid,
    total_outstanding: totalOutstanding,
    this_year_sales: thisYearSales
  }
}

async function getCustomerPaymentStats(customerId) {
  const { data: paymentData } = await supabase
    .from('payments')
    .select('amount, payment_date')
    .eq('customer_id', customerId)
    .eq('payment_type', 'received')

  if (!paymentData) return null

  const totalPayments = paymentData.length
  const totalReceived = paymentData.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0)

  // Last payment date
  const lastPaymentDate = paymentData.length > 0 
    ? Math.max(...paymentData.map(p => new Date(p.payment_date).getTime()))
    : null

  return {
    total_payments: totalPayments,
    total_received: totalReceived,
    last_payment_date: lastPaymentDate ? new Date(lastPaymentDate).toISOString() : null
  }
}

async function getCustomerRecentActivity(customerId, limit = 5) {
  const { data: activities } = await supabase
    .from('sales_documents')
    .select('id, document_type, document_number, document_date, total_amount, status')
    .eq('customer_id', customerId)
    .order('document_date', { ascending: false })
    .limit(limit)

  return activities || []
}

// Helper functions (reused from index.js)
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidGSTIN(gstin) {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return gstinRegex.test(gstin)
}

function isValidPAN(pan) {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  return panRegex.test(pan)
}

export default withAuth(handler)