// src/pages/api/items/stock/adjustment.js - UPDATED WITH BRANCH
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'POST':
        return await createAdjustment(req, res)
      case 'GET':
        return await getAdjustments(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Stock adjustment API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

async function createAdjustment(req, res) {
  const {
    company_id,
    branch_id, // NEW: Track which branch
    item_id,
    adjustment_type, // set, increase, decrease
    quantity,
    reason,
    notes,
    movement_date
  } = req.body

  if (!company_id || !item_id || !adjustment_type || quantity === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, item ID, adjustment type, and quantity are required'
    })
  }

  // Validate branch if provided
  if (branch_id) {
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('id', branch_id)
      .eq('company_id', company_id)
      .single()

    if (branchError || !branch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch'
      })
    }
  }

  try {
    // Get current item
    const { data: item, error: itemError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', item_id)
      .eq('company_id', company_id)
      .eq('track_inventory', true)
      .single()

    if (itemError || !item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found or does not track inventory'
      })
    }

    // Calculate new stock
    const currentStock = parseFloat(item.current_stock) || 0
    const quantityValue = parseFloat(quantity)
    let newStock

    if (adjustment_type === 'set') {
      newStock = quantityValue
    } else if (adjustment_type === 'increase') {
      newStock = currentStock + quantityValue
    } else if (adjustment_type === 'decrease') {
      newStock = Math.max(0, currentStock - quantityValue)
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid adjustment type'
      })
    }

    const stockChange = newStock - currentStock

    // Update item stock
    const { error: updateError } = await supabaseAdmin
      .from('items')
      .update({
        current_stock: newStock,
        available_stock: Math.max(0, newStock - (parseFloat(item.reserved_stock) || 0)),
        updated_at: new Date().toISOString()
      })
      .eq('id', item_id)

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update stock'
      })
    }

    // Log inventory movement WITH BRANCH INFO
    const { data: movement, error: movementError } = await supabaseAdmin
      .from('inventory_movements')
      .insert({
        company_id,
        item_id,
        item_code: item.item_code,
        branch_id: branch_id || null, // NEW: Track branch
        movement_type: 'adjustment',
        quantity: Math.abs(stockChange),
        reference_type: 'stock_adjustment',
        reference_number: `ADJ-${Date.now()}`,
        stock_before: currentStock,
        stock_after: newStock,
        movement_date: movement_date || new Date().toISOString().split('T')[0],
        notes: `${reason || ''} ${notes || ''}`.trim(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (movementError) {
      console.error('Error logging movement:', movementError)
    }

    return res.status(201).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        item_id,
        old_stock: currentStock,
        new_stock: newStock,
        stock_change: stockChange,
        adjustment_type,
        branch_id: branch_id || null,
        movement_id: movement?.id
      }
    })

  } catch (error) {
    console.error('Error in createAdjustment:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create adjustment'
    })
  }
}

async function getAdjustments(req, res) {
  const { 
    company_id,
    branch_id, // NEW: Filter by branch
    item_id,
    date_from,
    date_to,
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
    let query = supabaseAdmin
      .from('inventory_movements')
      .select(`
        *,
        item:items(id, item_name, item_code, category),
        branch:branches(id, name, document_prefix)
      `, { count: 'exact' })
      .eq('company_id', company_id)
      .eq('movement_type', 'adjustment')

    // Apply filters
    if (branch_id) {
      query = query.eq('branch_id', branch_id)
    }

    if (item_id) {
      query = query.eq('item_id', item_id)
    }

    if (date_from) {
      query = query.gte('movement_date', date_from)
    }

    if (date_to) {
      query = query.lte('movement_date', date_to)
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const offset = (pageNum - 1) * limitNum

    query = query
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1)

    const { data: adjustments, error, count } = await query

    if (error) {
      console.error('Error fetching adjustments:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch adjustments'
      })
    }

    const totalPages = Math.ceil(count / limitNum)

    return res.status(200).json({
      success: true,
      data: adjustments,
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
    console.error('Error in getAdjustments:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch adjustments'
    })
  }
}

export default withAuth(handler)