// pages/api/items/index.js
import { supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getItems(req, res)
      case 'POST':
        return await createItem(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Items API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getItems(req, res) {
  const { 
    company_id, 
    item_type, 
    category,
    is_active,
    track_inventory,
    low_stock,
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
    .from('items')
    .select(`
      *,
      category_data:category_id(id, category_name)
    `, { count: 'exact' })
    .eq('company_id', company_id)

  // Exclude deleted items by default (CRITICAL FOR SOFT DELETE)
  if (include_deleted !== 'true') {
    query = query.is('deleted_at', null)
  }

  // Apply filters
  if (item_type && ['product', 'service'].includes(item_type)) {
    query = query.eq('item_type', item_type)
  }

  if (category && category.trim()) {
    query = query.eq('category', category.trim())
  }

  // Active/Inactive filter
  if (is_active === 'true') {
    query = query.eq('is_active', true)
  } else if (is_active === 'false') {
    query = query.eq('is_active', false)
  }

  // Track inventory filter
  if (track_inventory === 'true') {
    query = query.eq('track_inventory', true)
  }

  // Low stock filter
  if (low_stock === 'true') {
    query = query.eq('track_inventory', true)
    // We can't use column comparison in Supabase JS, so we'll filter in JavaScript
  }

  // Search functionality
  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      item_name.ilike.%${searchTerm}%,
      item_code.ilike.%${searchTerm}%,
      description.ilike.%${searchTerm}%,
      category.ilike.%${searchTerm}%,
      brand.ilike.%${searchTerm}%,
      hsn_sac_code.ilike.%${searchTerm}%
    `)
  }

  // Sorting
  const allowedSortFields = ['item_name', 'item_code', 'created_at', 'updated_at', 'selling_price', 'selling_price_with_tax', 'current_stock']
  const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at'
  const sortDirection = sort_order === 'asc'
  
  query = query.order(sortField, { ascending: sortDirection })

  // Pagination
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  query = query.range(offset, offset + limitNum - 1)

  const { data: items, error, count } = await query

  if (error) {
    console.error('Error fetching items:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch items'
    })
  }

  // Apply low stock filter in JavaScript if needed
  let filteredItems = items
  if (low_stock === 'true' && items) {
    filteredItems = items.filter(item => 
      item.track_inventory && 
      parseFloat(item.current_stock || 0) <= parseFloat(item.reorder_level || 0)
    )
  }

  // Recalculate count if we filtered in JavaScript
  const finalCount = low_stock === 'true' ? filteredItems.length : count

  // Calculate pagination info
  const totalPages = Math.ceil(finalCount / limitNum)
  const hasNextPage = pageNum < totalPages
  const hasPrevPage = pageNum > 1

  return res.status(200).json({
    success: true,
    data: filteredItems,
    pagination: {
      current_page: pageNum,
      total_pages: totalPages,
      total_records: finalCount,
      per_page: limitNum,
      has_next_page: hasNextPage,
      has_prev_page: hasPrevPage
    }
  })
}

async function createItem(req, res) {
  const { 
    company_id,
    item_code,
    item_name,
    print_name,
    display_name,
    description,
    item_type,
    category,
    category_id, // 🆕 NEW: Accept category_id
    brand,
    selling_price,
    selling_price_with_tax,
    purchase_price,
    mrp,
    primary_unit_id,
    secondary_unit_id,
    conversion_factor,
    hsn_sac_code,
    tax_rate_id,
    tax_preference,
    track_inventory,
    current_stock,
    reorder_level,
    max_stock_level,
    barcode,
    images,
    specifications,
    is_active,
    is_for_sale,
    is_for_purchase,
    auto_generate_code = true
  } = req.body

  if (!company_id || !item_name) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and item name are required'
    })
  }

  // Validate item type
  if (item_type && !['product', 'service'].includes(item_type)) {
    return res.status(400).json({
      success: false,
      error: 'Item type must be either product or service'
    })
  }

  // Check for duplicate item code (excluding deleted items)
  if (item_code) {
    const { data: duplicate } = await supabaseAdmin
      .from('items')
      .select('id')
      .eq('company_id', company_id)
      .eq('item_code', item_code.trim())
      .is('deleted_at', null)
      .single()

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: 'Item with this code already exists'
      })
    }
  }

  // Generate item code if not provided
  let finalItemCode = item_code
  if (!finalItemCode && auto_generate_code) {
    finalItemCode = await generateItemCode(company_id, item_type || 'product')
  }

  // Calculate available stock
  const currentStockValue = parseFloat(current_stock) || 0
  const reservedStockValue = 0 // New items have no reserved stock

  // Prepare item data - MATCHES YOUR SCHEMA EXACTLY
  const itemData = {
    company_id,
    item_code: finalItemCode?.trim(),
    item_name: item_name.trim(),
    display_name: display_name?.trim() || item_name.trim(),
    print_name: print_name?.trim() || item_name.trim(),
    description: description?.trim(),
    item_type: item_type || 'product',
    category: category?.trim(), // Keep for backward compatibility
    category_id: category_id || null, // 🆕 NEW: Save category_id (foreign key)
    brand: brand?.trim(),
    selling_price: parseFloat(selling_price) || 0,
    selling_price_with_tax: parseFloat(selling_price_with_tax) || 0,
    purchase_price: parseFloat(purchase_price) || 0,
    mrp: mrp ? parseFloat(mrp) : null,
    primary_unit_id: primary_unit_id || null,
    secondary_unit_id: secondary_unit_id || null,
    conversion_factor: parseFloat(conversion_factor) || 1,
    hsn_sac_code: hsn_sac_code?.trim(),
    tax_rate_id: tax_rate_id || null,
    tax_preference: tax_preference || 'taxable',
    track_inventory: track_inventory === true || track_inventory === 'true',
    current_stock: currentStockValue,
    reserved_stock: reservedStockValue,
    available_stock: currentStockValue - reservedStockValue,
    reorder_level: parseFloat(reorder_level) || 0,
    max_stock_level: max_stock_level ? parseFloat(max_stock_level) : null,
    barcode: barcode?.trim(),
    images: images || [],
    specifications: specifications || {},
    is_active: is_active !== false,
    is_for_sale: is_for_sale !== false,
    is_for_purchase: is_for_purchase !== false,
    deleted_at: null, // Explicitly set to null for new items
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: item, error } = await supabaseAdmin
    .from('items')
    .insert(itemData)
    .select()
    .single()

  if (error) {
    console.error('Error creating item:', error)
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Item with this code already exists'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create item',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }

  // Create opening stock movement if item tracks inventory and has opening stock
  if (itemData.track_inventory && currentStockValue > 0) {
    const { error: movementError } = await supabaseAdmin
      .from('inventory_movements')
      .insert({
        company_id,
        item_id: item.id,
        item_code: item.item_code,
        branch_id: null,
        movement_type: 'in',
        quantity: currentStockValue,
        reference_type: 'opening_stock',
        reference_number: `OPENING-${item.item_code}`,
        stock_before: 0,
        stock_after: currentStockValue,
        movement_date: new Date().toISOString().split('T')[0],
        notes: 'Opening stock balance',
        created_at: new Date().toISOString()
      })

    if (movementError) {
      console.error('Error creating opening stock movement:', movementError)
      // Don't fail the item creation, just log the error
    }
  }

  return res.status(201).json({
    success: true,
    message: 'Item created successfully',
    data: item
  })
}

// Helper function to generate next item code
async function generateItemCode(company_id, item_type) {
  const prefix = item_type === 'service' ? 'SRV' : 'ITM'
  
  console.log('Generating next code for:', { company_id, item_type })
  
  // Get the last item code for this type (excluding deleted items)
  const { data: lastItem } = await supabaseAdmin
    .from('items')
    .select('item_code')
    .eq('company_id', company_id)
    .eq('item_type', item_type)
    .is('deleted_at', null)
    .like('item_code', `${prefix}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let nextNumber = 1
  if (lastItem && lastItem.item_code) {
    const match = lastItem.item_code.match(new RegExp(`${prefix}-(\\d+)`))
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }

  const generatedCode = `${prefix}-${nextNumber.toString().padStart(4, '0')}`
  console.log('Generated next code:', generatedCode)
  
  return generatedCode
}

export default withAuth(handler)