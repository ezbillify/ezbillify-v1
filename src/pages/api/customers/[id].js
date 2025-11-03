// pages/api/customers/[id].js - UPDATED WITH DISCOUNT_PERCENTAGE
import { supabaseAdmin } from '../../../services/utils/supabase'
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
  const { company_id, include_credit = 'false' } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // ✅ UPDATED: Include discount_percentage in SELECT
    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .select(`
        *,
        discount_percentage
      `)
      .eq('id', customerId)
      .eq('company_id', company_id)
      .single()

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

    let customerData = {
      ...customer,
      discount_percentage: parseFloat(customer.discount_percentage) || 0
    }

    // ✅ Optionally fetch credit info if requested
    if (include_credit === 'true') {
      console.log('📊 Including credit info')
      const creditInfo = await fetchCreditInfo(customerId, company_id, customer)
      customerData = {
        ...customerData,
        credit_info: creditInfo
      }
    }

    return res.status(200).json({
      success: true,
      data: customerData
    })
  } catch (error) {
    console.error('Query error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Fetch credit information
 */
async function fetchCreditInfo(customerId, companyId, customer) {
  try {
    // Get latest ledger balance
    const { data: latestLedger } = await supabaseAdmin
      .from('customer_ledger_entries')
      .select('balance')
      .eq('customer_id', customerId)
      .eq('company_id', companyId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let outstandingBalance = 0
    if (latestLedger) {
      outstandingBalance = parseFloat(latestLedger.balance) || 0
    } else {
      // Fallback to opening balance
      outstandingBalance = parseFloat(customer.opening_balance) || 0
      if (customer.opening_balance_type === 'credit') {
        outstandingBalance = -outstandingBalance
      }
    }

    const creditLimit = parseFloat(customer.credit_limit) || 0
    const availableCredit = creditLimit > 0 ? creditLimit - outstandingBalance : null

    return {
      credit_limit: creditLimit,
      outstanding_balance: outstandingBalance,
      available_credit: availableCredit,
      can_create_invoice: creditLimit === 0 || availableCredit >= 0
    }
  } catch (error) {
    console.error('Error fetching credit info:', error)
    return null
  }
}

// ============================================
// UPDATE CUSTOMER
// ============================================
async function updateCustomer(req, res, customerId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    const { data: existingCustomer, error: fetchError } = await supabaseAdmin
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

    if (req.body.email && !isValidEmail(req.body.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      })
    }

    if (req.body.gstin && !isValidGSTIN(req.body.gstin)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GSTIN format'
      })
    }

    if (req.body.pan && !isValidPAN(req.body.pan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PAN format'
      })
    }

    // ✅ NEW: Validate discount percentage
    if (req.body.discount_percentage !== undefined && req.body.discount_percentage !== null) {
      const discountPercent = parseFloat(req.body.discount_percentage)
      if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        return res.status(400).json({
          success: false,
          error: 'Discount percentage must be between 0 and 100'
        })
      }
    }

    // Check for duplicates
    if (req.body.email || req.body.gstin) {
      const conditions = []
      if (req.body.email) conditions.push(`email.eq.${req.body.email}`)
      if (req.body.gstin) conditions.push(`gstin.eq.${req.body.gstin}`)

      if (conditions.length > 0) {
        const { data: duplicates } = await supabaseAdmin
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

    // ✅ UPDATED: Include discount_percentage in allowed fields
    const allowedFields = [
      'name', 'display_name', 'email', 'phone', 'mobile', 'website',
      'company_name', 'contact_person', 'designation', 'gstin', 'pan', 'business_type',
      'billing_address', 'shipping_address', 'credit_limit', 'payment_terms', 
      'price_list_id', 'tax_preference', 'discount_percentage', 'tags', 'notes', 'status'
    ]

    const updateData = {}
    
    allowedFields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        let value = req.body[field]
        
        if (field === 'email' && value) {
          value = value.toLowerCase().trim()
        } else if (['name', 'display_name', 'company_name', 'contact_person', 'designation', 'notes'].includes(field) && value) {
          value = value.trim()
        } else if (['gstin', 'pan'].includes(field) && value) {
          value = value.toUpperCase().trim()
        } else if (['credit_limit', 'discount_percentage'].includes(field)) {
          value = parseFloat(value) || 0
        } else if (['payment_terms'].includes(field)) {
          value = parseInt(value) || 0
        }
        
        updateData[field] = value
      }
    })

    updateData.updated_at = new Date().toISOString()

    const { data: updatedCustomer, error: updateError } = await supabaseAdmin
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

    console.log(`✅ Customer updated. Discount: ${updateData.discount_percentage || 0}%`)

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer
    })
  } catch (error) {
    console.error('Update error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update customer'
    })
  }
}

// ============================================
// DELETE CUSTOMER
// ============================================
async function deleteCustomer(req, res, customerId) {
  const { company_id, force = false } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    const { data: customer, error: fetchError } = await supabaseAdmin
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

    if (!force) {
      const { data: transactions } = await supabaseAdmin
        .from('sales_documents')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1)

      if (transactions && transactions.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete customer with existing transactions. Use force=true to override.',
          has_transactions: true
        })
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('customers')
      .update({
        status: 'deleted',
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
  } catch (error) {
    console.error('Delete error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete customer'
    })
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
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