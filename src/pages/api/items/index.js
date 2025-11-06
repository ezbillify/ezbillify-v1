// ✅ NUCLEAR FIX: src/pages/api/items/index.js
// This FORCES tax_rate into response - no matter what

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
    include_deleted = false,
    is_for_sale = 'true'
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Try to include tax_rates relationship
  let query = supabaseAdmin
    .from('items')
    .select(`
      *,
      primary_unit:units!items_primary_unit_id_fkey(unit_name, unit_symbol),
      secondary_unit:units!items_secondary_unit_id_fkey(unit_name, unit_symbol),
      tax_rates:tax_rate_id(id, tax_rate, tax_name, cgst_rate, sgst_rate, igst_rate)
    `, { count: 'exact' })
    .eq('company_id', company_id)

  if (include_deleted !== 'true') {
    query = query.is('deleted_at', null)
  }

  if (item_type && ['product', 'service'].includes(item_type)) {
    query = query.eq('item_type', item_type)
  }

  if (category && category.trim()) {
    query = query.eq('category', category.trim())
  }

  if (is_active === 'true') {
    query = query.eq('is_active', true)
  } else if (is_active === 'false') {
    query = query.eq('is_active', false)
  }

  if (is_for_sale === 'true') {
    query = query.eq('is_for_sale', true)
  }

  if (track_inventory === 'true') {
    query = query.eq('track_inventory', true)
  }

  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      item_name.ilike.%${searchTerm}%,
      item_code.ilike.%${searchTerm}%,
      description.ilike.%${searchTerm}%,
      category.ilike.%${searchTerm}%,
      brand.ilike.%${searchTerm}%,
      hsn_sac_code.ilike.%${searchTerm}%,
      barcodes.ilike.%${searchTerm}%
    `)
  }

  const allowedSortFields = ['item_name', 'item_code', 'created_at', 'updated_at', 'selling_price', 'selling_price_with_tax', 'current_stock']
  const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at'
  const sortDirection = sort_order === 'asc'
  
  query = query.order(sortField, { ascending: sortDirection })

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  query = query.range(offset, offset + limitNum - 1)

  const { data: items, error, count } = await query

  if (error) {
    console.error('❌ Items API Error:', error)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch items',
      details: error.message,
      errorCode: error.code,
      errorHint: error.hint
    })
  }

  console.log(`✅ Fetched ${items?.length || 0} items from database`)

  // ✅ NUCLEAR: FORCE tax_rate into response
  const itemsWithTaxRates = (items || []).map(item => {
    // Extract tax_rate from tax_rates relationship
    const taxRate = item.tax_rates?.[0]?.tax_rate || 0
    const taxRateId = item.tax_rates?.[0]?.id || item.tax_rate_id || null
    const cgstRate = item.tax_rates?.[0]?.cgst_rate || 0
    const sgstRate = item.tax_rates?.[0]?.sgst_rate || 0
    const igstRate = item.tax_rates?.[0]?.igst_rate || 0

    // FORCE the fields into response
    return {
      ...item,
      tax_rate: parseFloat(taxRate) || 0,           // ✅ ALWAYS include this
      tax_rate_id: taxRateId,                       // ✅ ALWAYS include this
      cgst_rate: parseFloat(cgstRate) || 0,
      sgst_rate: parseFloat(sgstRate) || 0,
      igst_rate: parseFloat(igstRate) || 0,
      tax_rates: undefined                          // Remove array to keep response clean
    }
  })

  let filteredItems = itemsWithTaxRates
  if (low_stock === 'true' && itemsWithTaxRates) {
    filteredItems = itemsWithTaxRates.filter(item => 
      item.track_inventory && 
      parseFloat(item.current_stock || 0) <= parseFloat(item.reorder_level || 0)
    )
  }

  const finalCount = low_stock === 'true' ? filteredItems.length : count
  const totalPages = Math.ceil(finalCount / limitNum)
  const hasNextPage = pageNum < totalPages
  const hasPrevPage = pageNum > 1

  console.log(`✅ Items API returning ${filteredItems.length} items`)
  console.log(`First item tax_rate: ${filteredItems[0]?.tax_rate || 'none'}`)

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
    category_id,
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
    barcode, // Old single barcode (for backward compatibility)
    barcodes, // New array of barcodes
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

  if (item_type && !['product', 'service'].includes(item_type)) {
    return res.status(400).json({
      success: false,
      error: 'Item type must be either product or service'
    })
  }

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

  let finalItemCode = item_code
  if (!finalItemCode && auto_generate_code) {
    finalItemCode = await generateItemCode(company_id, item_type || 'product')
  }

  const currentStockValue = parseFloat(current_stock) || 0
  const reservedStockValue = 0

  // Handle barcodes - support both old single barcode and new array format
  let finalBarcodes = []
  if (barcodes && Array.isArray(barcodes)) {
    // New format: array of barcodes
    finalBarcodes = barcodes.filter(b => b && b.trim()).map(b => b.trim())
  } else if (barcode && barcode.trim()) {
    // Old format: single barcode - convert to array
    finalBarcodes = [barcode.trim()]
  }

  const itemData = {
    company_id,
    item_code: finalItemCode?.trim(),
    item_name: item_name.trim(),
    display_name: display_name?.trim() || item_name.trim(),
    print_name: print_name?.trim() || item_name.trim(),
    description: description?.trim(),
    item_type: item_type || 'product',
    category: category?.trim(),
    category_id: category_id || null,
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
    barcodes: finalBarcodes, // Store as array in new barcodes column
    images: images || [],
    specifications: specifications || {},
    is_active: is_active !== false,
    is_for_sale: is_for_sale !== false,
    is_for_purchase: is_for_purchase !== false,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  console.log(`📝 Creating item with ${finalBarcodes.length} barcodes:`, finalBarcodes)

  const { data: item, error } = await supabaseAdmin
    .from('items')
    .insert(itemData)
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating item:', error)
    console.error('❌ Error code:', error.code)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error hint:', error.hint)
    console.error('❌ Error details:', JSON.stringify(error.details))

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: error.message || 'Item with this code or barcode already exists',
        code: error.code,
        hint: error.hint,
        details: process.env.NODE_ENV === 'development' ? error.details : undefined
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create item',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code
    })
  }

  console.log(`✅ Item created successfully: ${item.item_name} (${item.item_code})`)

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
    }
  }

  return res.status(201).json({
    success: true,
    message: 'Item created successfully',
    data: item
  })
}

async function generateItemCode(company_id, item_type) {
  const prefix = item_type === 'service' ? 'SRV' : 'ITM'
  
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
  return generatedCode
}

export default withAuth(handler)