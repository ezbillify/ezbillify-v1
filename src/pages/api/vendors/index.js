// pages/api/vendors/index.js
import { supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getVendors(req, res)
      case 'POST':
        return await createVendor(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Vendors API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getVendors(req, res) {
  const { 
    company_id,
    vendor_type,
    status,
    is_active,
    search,
    page = 1,
    limit = 50,
    sort_by = 'created_at',
    sort_order = 'desc',
    include_deleted = false
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Build query
  let query = supabaseAdmin
    .from('vendors')
    .select('*', { count: 'exact' })
    .eq('company_id', company_id)

  // Exclude deleted vendors by default (CRITICAL FOR SOFT DELETE)
  if (include_deleted !== 'true') {
    query = query.is('deleted_at', null)
  }

  // Apply filters
  if (vendor_type && ['b2b', 'b2c', 'both'].includes(vendor_type)) {
    query = query.eq('vendor_type', vendor_type)
  }

  if (status && status.trim()) {
    query = query.eq('status', status.trim())
  }

  // Active/Inactive filter
  if (is_active === 'true') {
    query = query.eq('is_active', true)
  } else if (is_active === 'false') {
    query = query.eq('is_active', false)
  }

  // Search functionality
  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      vendor_name.ilike.%${searchTerm}%,
      vendor_code.ilike.%${searchTerm}%,
      display_name.ilike.%${searchTerm}%,
      email.ilike.%${searchTerm}%,
      phone.ilike.%${searchTerm}%,
      gstin.ilike.%${searchTerm}%,
      pan.ilike.%${searchTerm}%
    `)
  }

  // Sorting
  const allowedSortFields = [
    'vendor_name', 
    'vendor_code', 
    'created_at', 
    'updated_at', 
    'opening_balance',
    'current_balance'
  ]
  const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at'
  const sortDirection = sort_order === 'asc'
  
  query = query.order(sortField, { ascending: sortDirection })

  // Pagination
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  query = query.range(offset, offset + limitNum - 1)

  const { data: vendors, error, count } = await query

  if (error) {
    console.error('Error fetching vendors:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch vendors'
    })
  }

  // Calculate pagination info
  const totalPages = Math.ceil(count / limitNum)
  const hasNextPage = pageNum < totalPages
  const hasPrevPage = pageNum > 1

  return res.status(200).json({
    success: true,
    data: vendors,
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

async function createVendor(req, res) {
  const {
    company_id,
    vendor_code,
    vendor_name,
    display_name,
    vendor_type,
    email,
    phone,
    alternate_phone,
    website,
    gstin,
    pan,
    billing_address,
    shipping_address,
    same_as_billing,
    bank_details,
    payment_terms,
    credit_limit,
    opening_balance,
    opening_balance_type,
    notes,
    status,
    is_active,
    auto_generate_code = true
  } = req.body

  if (!company_id || !vendor_name) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and vendor name are required'
    })
  }

  // Validate vendor type
  if (vendor_type && !['b2b', 'b2c', 'both'].includes(vendor_type)) {
    return res.status(400).json({
      success: false,
      error: 'Vendor type must be b2b, b2c, or both'
    })
  }

  // Check for duplicate vendor code (excluding deleted vendors)
  if (vendor_code) {
    const { data: duplicate } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('company_id', company_id)
      .eq('vendor_code', vendor_code.trim())
      .is('deleted_at', null)
      .single()

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: 'Vendor with this code already exists'
      })
    }
  }

  // Check for duplicate GSTIN (excluding deleted vendors)
  if (gstin && gstin.trim()) {
    const { data: duplicate } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('company_id', company_id)
      .eq('gstin', gstin.trim().toUpperCase())
      .is('deleted_at', null)
      .single()

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: 'Vendor with this GSTIN already exists'
      })
    }
  }

  // Generate vendor code if not provided
  let finalVendorCode = vendor_code
  if (!finalVendorCode && auto_generate_code) {
    finalVendorCode = await generateVendorCode(company_id)
  }

  // Calculate current balance from opening balance
  const openingBalanceValue = parseFloat(opening_balance) || 0
  const balanceType = opening_balance_type || 'payable'
  const currentBalance = balanceType === 'payable' 
    ? openingBalanceValue 
    : -Math.abs(openingBalanceValue)

  // Prepare vendor data - MATCHES YOUR SCHEMA EXACTLY
  const vendorData = {
    company_id,
    vendor_code: finalVendorCode?.trim(),
    vendor_name: vendor_name.trim(),
    display_name: display_name?.trim() || vendor_name.trim(),
    vendor_type: vendor_type || 'b2b',
    email: email?.trim().toLowerCase(),
    phone: phone?.trim(),
    alternate_phone: alternate_phone?.trim(),
    website: website?.trim(),
    gstin: gstin?.trim().toUpperCase(),
    pan: pan?.trim().toUpperCase(),
    billing_address: billing_address || null,
    shipping_address: same_as_billing ? billing_address : (shipping_address || null),
    same_as_billing: same_as_billing === true || same_as_billing === 'true',
    bank_details: bank_details || null,
    payment_terms: payment_terms || 'immediate',
    credit_limit: credit_limit ? parseFloat(credit_limit) : null,
    opening_balance: openingBalanceValue,
    opening_balance_type: balanceType,
    current_balance: currentBalance,
    notes: notes?.trim(),
    status: status || 'active',
    is_active: is_active !== false,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: vendor, error } = await supabaseAdmin
    .from('vendors')
    .insert(vendorData)
    .select()
    .single()

  if (error) {
    console.error('Error creating vendor:', error)
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Vendor with this code or GSTIN already exists'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create vendor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }

  return res.status(201).json({
    success: true,
    message: 'Vendor created successfully',
    data: vendor
  })
}

// Helper function to generate next vendor code
async function generateVendorCode(company_id) {
  const prefix = 'VEN'
  
  console.log('Generating next vendor code for:', company_id)
  
  // Get the last vendor code (excluding deleted vendors)
  const { data: lastVendor } = await supabaseAdmin
    .from('vendors')
    .select('vendor_code')
    .eq('company_id', company_id)
    .is('deleted_at', null)
    .like('vendor_code', `${prefix}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let nextNumber = 1
  if (lastVendor && lastVendor.vendor_code) {
    const match = lastVendor.vendor_code.match(new RegExp(`${prefix}-(\\d+)`))
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }

  const generatedCode = `${prefix}-${nextNumber.toString().padStart(4, '0')}`
  console.log('Generated vendor code:', generatedCode)
  
  return generatedCode
}

export default withAuth(handler)