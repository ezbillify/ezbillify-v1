// pages/api/items/stock/current.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getCurrentStock(req, res)
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
    category,
    search,
    stock_status,
    page = 1,
    limit = 50 
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Build query for items with inventory tracking
    let query = supabaseAdmin
      .from('items')
      .select(`
        id, 
        item_code, 
        item_name, 
        category, 
        current_stock, 
        reserved_stock, 
        available_stock, 
        reorder_level, 
        max_stock_level, 
        selling_price,
        primary_unit_id,
        updated_at
      `, { count: 'exact' })
      .eq('company_id', company_id)
      .eq('track_inventory', true)
      .eq('is_active', true)
      .is('deleted_at', null)

    // Apply category filter
    if (category && category.trim()) {
      query = query.eq('category', category.trim())
    }

    // Apply search filter
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

    const { data: items, error: queryError, count } = await query

    if (queryError) {
      console.error('Query error:', queryError)
      throw new Error(`Database query failed: ${queryError.message}`)
    }

    // Get units data separately for each item
    const itemsWithUnits = await Promise.all(
      (items || []).map(async (item) => {
        if (item.primary_unit_id) {
          const { data: unit } = await supabaseAdmin
            .from('units')
            .select('unit_name, unit_symbol')
            .eq('id', item.primary_unit_id)
            .single()

          return {
            ...item,
            primary_unit: unit
          }
        }
        return item
      })
    )

    // Filter by stock status after fetching (since Supabase can't compare columns easily)
    let filteredItems = itemsWithUnits
    if (stock_status === 'low-stock') {
      filteredItems = itemsWithUnits.filter(item => 
        item.reorder_level && item.current_stock <= item.reorder_level && item.current_stock > 0
      )
    } else if (stock_status === 'out-of-stock') {
      filteredItems = itemsWithUnits.filter(item => item.current_stock === 0)
    } else if (stock_status === 'in-stock') {
      filteredItems = itemsWithUnits.filter(item => 
        !item.reorder_level || item.current_stock > item.reorder_level
      )
    }

    const finalCount = stock_status ? filteredItems.length : count

    // Calculate stock statistics
    const allItems = itemsWithUnits
    const stockStats = {
      total_items: count || 0,
      low_stock_items: allItems.filter(item => 
        item.reorder_level && item.current_stock <= item.reorder_level && item.current_stock > 0
      ).length,
      out_of_stock_items: allItems.filter(item => item.current_stock === 0).length,
      total_stock_value: allItems.reduce((sum, item) => 
        sum + (parseFloat(item.current_stock || 0) * parseFloat(item.selling_price || 0)), 0
      )
    }

    // Pagination info
    const totalPages = Math.ceil(finalCount / limitNum)

    return res.status(200).json({
      success: true,
      data: filteredItems,
      statistics: stockStats,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_records: finalCount,
        per_page: limitNum,
        has_next_page: pageNum < totalPages,
        has_prev_page: pageNum > 1
      }
    })

  } catch (error) {
    console.error('Error in getCurrentStock:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stock data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)