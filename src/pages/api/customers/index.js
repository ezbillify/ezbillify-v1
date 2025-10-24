// pages/api/customers/index.js
import { supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getCustomers(req, res)
      case 'POST':
        return await createCustomer(req, res)
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

async function getCustomers(req, res) {
  const { 
    company_id, 
    customer_type, 
    status, 
    search, 
    page = 1, 
    limit = 50,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Build query - Using supabaseAdmin to bypass RLS
  // RLS is bypassed here because we already validate company_id via withAuth middleware
  let query = supabaseAdmin
    .from('customers')
    .select(`
      *,
      _count:sales_documents(count)
    `, { count: 'exact' })
    .eq('company_id', company_id)

  // Apply filters
  if (customer_type && ['b2b', 'b2c'].includes(customer_type)) {
    query = query.eq('customer_type', customer_type)
  }

  if (status && ['active', 'inactive'].includes(status)) {
    query = query.eq('status', status)
  }

  // Search functionality
  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      name.ilike.%${searchTerm}%,
      email.ilike.%${searchTerm}%,
      phone.ilike.%${searchTerm}%,
      customer_code.ilike.%${searchTerm}%,
      company_name.ilike.%${searchTerm}%
    `)
  }

  // Sorting
  const allowedSortFields = ['name', 'created_at', 'updated_at', 'customer_code', 'customer_type']
  const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at'
  const sortDirection = sort_order === 'asc' ? true : false
  
  query = query.order(sortField, { ascending: sortDirection })

  // Pagination
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  query = query.range(offset, offset + limitNum - 1)

  const { data: customers, error, count } = await query

  if (error) {
    console.error('❌ Error fetching customers:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details
    })
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }

  console.log(`✅ Fetched ${customers?.length || 0} customers for company ${company_id}`)
  console.log('Sample customer:', customers?.[0])

  // Calculate pagination info
  const totalPages = Math.ceil(count / limitNum)
  const hasNextPage = pageNum < totalPages
  const hasPrevPage = pageNum > 1

  return res.status(200).json({
    success: true,
    data: customers,
    pagination: {
      current_page: pageNum,
      total_pages: totalPages,
      total_records: count,
      per_page: limitNum,
      has_next_page: hasNextPage,
      has_prev_page: hasPrevPage
    }
  })
}

async function createCustomer(req, res) {
  const { 
    company_id,
    customer_type,
    name,
    email,
    phone,
    mobile,
    company_name,
    contact_person,
    designation,
    gstin,
    pan,
    business_type,
    billing_address,
    shipping_address,
    credit_limit,
    payment_terms,
    price_list_id,
    tax_preference,
    opening_balance,
    opening_balance_type,
    tags,
    notes,
    veekaart_customer_id,
    auto_generate_code = true
  } = req.body

  if (!company_id || !customer_type || !name) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, customer type, and name are required'
    })
  }

  // Validate customer type
  if (!['b2b', 'b2c'].includes(customer_type)) {
    return res.status(400).json({
      success: false,
      error: 'Customer type must be either b2b or b2c'
    })
  }

  // Validate email format if provided
  if (email && !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    })
  }

  // Validate GSTIN format if provided
  if (gstin && !isValidGSTIN(gstin)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid GSTIN format'
    })
  }

  // Validate PAN format if provided
  if (pan && !isValidPAN(pan)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid PAN format'
    })
  }

  // Check for duplicate email or GSTIN
  if (email || gstin) {
    let duplicateQuery = supabase
      .from('customers')
      .select('id, email, gstin')
      .eq('company_id', company_id)

    const conditions = []
    if (email) conditions.push(`email.eq.${email}`)
    if (gstin) conditions.push(`gstin.eq.${gstin}`)

    if (conditions.length > 0) {
      const { data: duplicates } = await duplicateQuery.or(conditions.join(','))
      
      if (duplicates && duplicates.length > 0) {
        const duplicate = duplicates[0]
        if (duplicate.email === email) {
          return res.status(400).json({
            success: false,
            error: 'Customer with this email already exists'
          })
        }
        if (duplicate.gstin === gstin) {
          return res.status(400).json({
            success: false,
            error: 'Customer with this GSTIN already exists'
          })
        }
      }
    }
  }

  // Generate customer code if not provided
  let customer_code = req.body.customer_code
  if (!customer_code && auto_generate_code) {
    customer_code = await generateCustomerCode(company_id, customer_type)
  }

  // Prepare customer data
  const customerData = {
    company_id,
    customer_code,
    customer_type,
    name: name.trim(),
    display_name: req.body.display_name || name.trim(),
    email: email?.toLowerCase().trim(),
    phone: phone?.trim(),
    mobile: mobile?.trim(),
    website: req.body.website?.trim(),
    
    // B2B specific fields
    company_name: customer_type === 'b2b' ? (company_name?.trim() || name.trim()) : null,
    contact_person: customer_type === 'b2b' ? contact_person?.trim() : null,
    designation: customer_type === 'b2b' ? designation?.trim() : null,
    gstin: customer_type === 'b2b' ? gstin?.toUpperCase().trim() : null,
    pan: pan?.toUpperCase().trim(),
    business_type: customer_type === 'b2b' ? business_type : null,
    
    // Addresses
    billing_address: billing_address || {},
    shipping_address: shipping_address || billing_address || {},
    
    // Business terms
    credit_limit: parseFloat(credit_limit) || 0,
    payment_terms: parseInt(payment_terms) || 0,
    price_list_id,
    tax_preference: tax_preference || 'taxable',
    
    // Opening balance
    opening_balance: parseFloat(opening_balance) || 0,
    opening_balance_type: opening_balance_type || 'debit',
    
    // Additional info
    tags: tags || [],
    notes: notes?.trim(),
    
    // VeeKaart integration
    veekaart_customer_id,
    veekaart_last_sync: veekaart_customer_id ? new Date().toISOString() : null,
    
    // Status
    status: 'active',
    
    // Timestamps
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select()
    .single()

  if (error) {
    console.error('Error creating customer:', error)
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        error: 'Customer with this code already exists'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create customer'
    })
  }

  // Create opening balance entry if provided
  if (customerData.opening_balance && customerData.opening_balance !== 0) {
    await createOpeningBalanceEntry(customer.id, customerData.opening_balance, customerData.opening_balance_type)
  }

  return res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: customer
  })
}

// Helper functions

async function generateCustomerCode(company_id, customer_type) {
  const prefix = customer_type === 'b2b' ? 'B2B' : 'B2C'
  
  // Get the last customer code for this type
  const { data: lastCustomer } = await supabase
    .from('customers')
    .select('customer_code')
    .eq('company_id', company_id)
    .eq('customer_type', customer_type)
    .like('customer_code', `${prefix}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let nextNumber = 1
  if (lastCustomer && lastCustomer.customer_code) {
    const match = lastCustomer.customer_code.match(new RegExp(`${prefix}-(\\d+)`))
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }

  return `${prefix}-${nextNumber.toString().padStart(4, '0')}`
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidGSTIN(gstin) {
  // GSTIN format: 15 characters alphanumeric
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return gstinRegex.test(gstin)
}

function isValidPAN(pan) {
  // PAN format: 10 characters alphanumeric
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  return panRegex.test(pan)
}

async function createOpeningBalanceEntry(customer_id, amount, type) {
  try {
    // This would create a journal entry for opening balance
    // Implementation depends on your accounting structure
    console.log(`Creating opening balance entry for customer ${customer_id}: ${amount} (${type})`)
  } catch (error) {
    console.error('Error creating opening balance entry:', error)
  }
}

export default withAuth(handler)