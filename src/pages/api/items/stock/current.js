// pages/api/items/stock/current.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getCurrentStock(req, res)
      case 'PUT':
        return await updateStock(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Stock API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getCurrentStock(req, res) {
  const { 
    company_id, 
    low_stock = false,
    out_of_stock = false,
    category,
    item_type,
    search,
    page = 1,
    limit = 50 
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Build query for items with inventory tracking
  let query = supabaseAdmin
    .from('items')
    .select(`
      id, item_code, item_name, category, current_stock, reserved_stock, 
      available_stock, reorder_level, max_stock_level, selling_price,
      primary_unit:units!items_primary_unit_id_fkey(unit_name, unit_symbol),
      veekaart_product_id, updated_at
    `, { count: 'exact' })
    .eq('company_id', company_id)
    .eq('track_inventory', true)
    .eq('is_active', true)

  // Apply filters
  if (category) {
    query = query.eq('category', category)
  }

  if (item_type) {
    query = query.eq('item_type', item_type)
  }

  if (low_stock === 'true') {
    // Items where current stock is at or below reorder level
    query = query.filter('current_stock', 'lte', 'reorder_level')
      .not('reorder_level', 'is', null)
  }

  if (out_of_stock === 'true') {
    query = query.eq('current_stock', 0)
  }

  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      item_name.ilike.%${searchTerm}%,
      item_code.ilike.%${searchTerm}%,
      category.ilike.%${searchTerm}%
    `)
  }

  // Pagination
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  query = query
    .order('item_name')
    .range(offset, offset + limitNum - 1)

  const { data: items, error, count } = await query

  if (error) {
    console.error('Error fetching stock data:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stock data'
    })
  }

  // Calculate stock statistics
  const stockStats = {
    total_items: count,
    low_stock_items: items?.filter(item => 
      item.reorder_level && item.current_stock <= item.reorder_level
    ).length || 0,
    out_of_stock_items: items?.filter(item => item.current_stock === 0).length || 0,
    total_stock_value: items?.reduce((sum, item) => 
      sum + (parseFloat(item.current_stock) * parseFloat(item.selling_price)), 0
    ) || 0
  }

  // Pagination info
  const totalPages = Math.ceil(count / limitNum)

  return res.status(200).json({
    success: true,
    data: items,
    statistics: stockStats,
    pagination: {
      current_page: pageNum,
      total_pages: totalPages,
      total_records: count,
      per_page: limitNum,
      has_next_page: pageNum < totalPages,
      has_prev_page: pageNum > 1
    }
  })
}

async function updateStock(req, res) {
  const { company_id, updates } = req.body

  if (!company_id || !updates || !Array.isArray(updates)) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and updates array are required'
    })
  }

  const results = []
  const errors = []

  // Process each stock update
  for (const update of updates) {
    try {
      const { item_id, new_stock, adjustment_type, reason, reference_number } = update

      if (!item_id || new_stock === undefined || new_stock === null) {
        errors.push({
          item_id,
          error: 'Item ID and new stock value are required'
        })
        continue
      }

      // Get current item data
      const { data: item, error: itemError } = await supabaseAdmin
        .from('items')
        .select('*')
        .eq('id', item_id)
        .eq('company_id', company_id)
        .eq('track_inventory', true)
        .single()

      if (itemError || !item) {
        errors.push({
          item_id,
          error: 'Item not found or does not track inventory'
        })
        continue
      }

      const newStockValue = parseFloat(new_stock)
      if (isNaN(newStockValue) || newStockValue < 0) {
        errors.push({
          item_id,
          error: 'Invalid stock value'
        })
        continue
      }

      const stockDifference = newStockValue - item.current_stock
      const movementType = adjustment_type || (stockDifference === 0 ? 'adjustment' : 
                          stockDifference > 0 ? 'in' : 'out')

      // Update item stock
      const { error: updateError } = await supabaseAdmin
        .from('items')
        .update({
          current_stock: newStockValue,
          available_stock: Math.max(0, newStockValue - (item.reserved_stock || 0)),
          updated_at: new Date().toISOString()
        })
        .eq('id', item_id)

      if (updateError) {
        errors.push({
          item_id,
          error: `Failed to update stock: ${updateError.message}`
        })
        continue
      }

      // Create inventory movement record
      await supabaseAdmin
        .from('inventory_movements')
        .insert({
          company_id,
          item_id,
          item_code: item.item_code,
          movement_type: movementType,
          quantity: Math.abs(stockDifference),
          reference_type: 'stock_adjustment',
          reference_number: reference_number || `STOCK-ADJ-${Date.now()}`,
          stock_before: item.current_stock,
          stock_after: newStockValue,
          movement_date: new Date().toISOString().split('T')[0],
          notes: reason || 'Stock adjustment via API',
          created_at: new Date().toISOString()
        })

      results.push({
        item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        old_stock: item.current_stock,
        new_stock: newStockValue,
        difference: stockDifference,
        movement_type: movementType
      })

    } catch (error) {
      console.error(`Error updating stock for item ${update.item_id}:`, error)
      errors.push({
        item_id: update.item_id,
        error: error.message
      })
    }
  }

  return res.status(200).json({
    success: errors.length === 0,
    message: `${results.length} items updated successfully`,
    data: results,
    errors: errors.length > 0 ? errors : undefined
  })
}

export default withAuth(handler)