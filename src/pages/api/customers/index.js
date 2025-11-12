// pages/api/customers/index.js - UPDATED WITH DISCOUNT_PERCENTAGE AND OPTIMIZED FOR SPEED
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
    limit = 20, // Reduced default limit for better performance
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // ✅ OPTIMIZED: Only select essential fields for list view
    let query = supabaseAdmin
      .from('customers')
      .select(
        `id, name, email, phone, mobile, gstin, status, customer_type, customer_code, 
         company_name, opening_balance, opening_balance_type, created_at, updated_at,
         credit_limit, discount_percentage, billing_address`,
        { count: 'exact' }
      )
      .eq('company_id', company_id)

    if (customer_type && ['b2b', 'b2c'].includes(customer_type)) {
      query = query.eq('customer_type', customer_type)
    }

    if (status && ['active', 'inactive'].includes(status)) {
      query = query.eq('status', status)
    }

    if (search && search.trim()) {
      const searchTerm = search.trim()
      // ✅ OPTIMIZED: More efficient search query
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%`)
    }

    const allowedSortFields = ['name', 'created_at', 'updated_at', 'customer_code', 'customer_type', 'discount_percentage']
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at'
    const sortDirection = sort_order === 'asc'
    
    query = query.order(sortField, { ascending: sortDirection })

    // ✅ OPTIMIZED: Better pagination limits
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const offset = (pageNum - 1) * limitNum

    query = query.range(offset, offset + limitNum - 1)

    const { data: customers, error, count } = await query

    if (error) {
      console.error('❌ Error fetching customers:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch customers',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    // ✅ FIXED: Calculate actual outstanding balance for each customer
    // First, get all customer IDs
    const customerIds = (customers || []).map(customer => customer.id);
    
    // Then calculate the correct outstanding balance for all customers
    const customerBalances = {};
    
    if (customerIds.length > 0) {
      // Get all ledger entries for these customers
      const { data: ledgerEntries, error: ledgerError } = await supabaseAdmin
        .from('customer_ledger_entries')
        .select('customer_id, debit_amount, credit_amount')
        .eq('company_id', company_id)
        .in('customer_id', customerIds)
      
      if (!ledgerError && ledgerEntries) {
        // Calculate balance for each customer
        ledgerEntries.forEach(entry => {
          if (!customerBalances[entry.customer_id]) {
            customerBalances[entry.customer_id] = 0;
          }
          // Add debit amounts, subtract credit amounts
          customerBalances[entry.customer_id] += (parseFloat(entry.debit_amount) || 0) - (parseFloat(entry.credit_amount) || 0);
        });
      }
    }

    // Transform customers with proper balances
    const enhancedCustomers = (customers || []).map(customer => {
      // Calculate opening balance value
      const openingBalance = parseFloat(customer.opening_balance) || 0
      const openingBalanceValue = customer.opening_balance_type === 'debit' ? openingBalance : -openingBalance

      // Use calculated ledger balance if available, otherwise use opening balance
      const currentBalance = customerBalances[customer.id] !== undefined ? 
        customerBalances[customer.id] : 
        openingBalanceValue

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        mobile: customer.mobile,
        gstin: customer.gstin,
        status: customer.status,
        customer_type: customer.customer_type,
        customer_code: customer.customer_code,
        company_name: customer.company_name,
        credit_limit: customer.credit_limit,
        discount_percentage: parseFloat(customer.discount_percentage) || 0,
        current_balance: currentBalance,
        opening_balance: openingBalanceValue,
        opening_balance_type: customer.opening_balance_type,
        billing_address: customer.billing_address || {},
        created_at: customer.created_at,
        updated_at: customer.updated_at
      }
    })

    const totalPages = Math.ceil(count / limitNum)

    console.log(`✅ Fetched ${customers?.length || 0} customers for company ${company_id}`)

    return res.status(200).json({
      success: true,
      data: enhancedCustomers,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_records: count,
        per_page: limitNum,
        has_next_page: pageNum < totalPages,
        has_prev_page: pageNum > 1
      }
    })
  } catch (error) {
    console.error('Query error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// ============================================
// CREATE CUSTOMER
// ============================================
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
    discount_percentage, // ✅ NEW FIELD
    tags,
    notes,
    auto_generate_code = true
  } = req.body

  if (!company_id || !customer_type || !name) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, customer type, and name are required'
    })
  }

  if (!['b2b', 'b2c'].includes(customer_type)) {
    return res.status(400).json({
      success: false,
      error: 'Customer type must be either b2b or b2c'
    })
  }

  // ✅ NEW: Validate discount percentage
  const discountPercent = parseFloat(discount_percentage) || 0
  if (discountPercent < 0 || discountPercent > 100) {
    return res.status(400).json({
      success: false,
      error: 'Discount percentage must be between 0 and 100'
    })
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    })
  }

  if (gstin && !isValidGSTIN(gstin)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid GSTIN format'
    })
  }

  if (pan && !isValidPAN(pan)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid PAN format'
    })
  }

  // Check for duplicates
  if (email || gstin) {
    let duplicateQuery = supabaseAdmin
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

  let customer_code = req.body.customer_code
  if (!customer_code && auto_generate_code) {
    customer_code = await generateCustomerCode(company_id, customer_type)
  }

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
    
    company_name: customer_type === 'b2b' ? (company_name?.trim() || name.trim()) : null,
    contact_person: customer_type === 'b2b' ? contact_person?.trim() : null,
    designation: customer_type === 'b2b' ? designation?.trim() : null,
    gstin: customer_type === 'b2b' ? gstin?.toUpperCase().trim() : null,
    pan: pan?.toUpperCase().trim(),
    business_type: customer_type === 'b2b' ? business_type : null,
    
    billing_address: billing_address || {},
    shipping_address: shipping_address || billing_address || {},
    
    credit_limit: parseFloat(credit_limit) || 0,
    payment_terms: parseInt(payment_terms) || 0,
    price_list_id,
    tax_preference: tax_preference || 'taxable',
    
    opening_balance: parseFloat(opening_balance) || 0,
    opening_balance_type: opening_balance_type || 'debit',
    
    discount_percentage: discountPercent, // ✅ NEW: Save discount
    
    tags: tags || [],
    notes: notes?.trim(),
    
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .insert(customerData)
    .select()
    .single()

  if (error) {
    console.error('Error creating customer:', error)
    
    if (error.code === '23505') {
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

  // Create opening balance ledger entry
  if (customerData.opening_balance && customerData.opening_balance !== 0) {
    const openingAmount = parseFloat(customerData.opening_balance)
    const isDebit = customerData.opening_balance_type === 'debit'

    await supabaseAdmin
      .from('customer_ledger_entries')
      .insert({
        company_id,
        customer_id: customer.id,
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'opening_balance',
        reference_type: 'customer',
        reference_id: customer.id,
        reference_number: customer_code,
        debit_amount: isDebit ? openingAmount : 0,
        credit_amount: isDebit ? 0 : openingAmount,
        balance: isDebit ? openingAmount : -openingAmount,
        description: `Opening balance for ${customerData.name}`,
        created_at: new Date().toISOString()
      })

    console.log('✅ Opening balance ledger entry created')
  }

  console.log(`✅ Customer created with ${discountPercent}% discount`)

  return res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: customer
  })
}

// ============================================
// HELPER FUNCTIONS
// ============================================
async function generateCustomerCode(company_id, customer_type) {
  const prefix = customer_type === 'b2b' ? 'B2B' : 'B2C'

  const { data: lastCustomer } = await supabaseAdmin
    .from('customers')
    .select('customer_code')
    .eq('company_id', company_id)
    .eq('customer_type', customer_type)
    .like('customer_code', `${prefix}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

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
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return gstinRegex.test(gstin)
}

function isValidPAN(pan) {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  return panRegex.test(pan)
}

export default withAuth(handler)