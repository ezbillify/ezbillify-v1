// src/pages/api/items/stock/movement.js - UPDATED WITH BRANCH
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getMovements(req, res)
      case 'POST':
        return await createMovement(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Stock movement API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

async function getMovements(req, res) {
  const { 
    company_id, 
    item_id,
    branch_id, // NEW: Filter by branch
    movement_type,
    reference_type,
    date_from,
    date_to,
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

  try {
    let query = supabaseAdmin
      .from('inventory_movements')
      .select(`
        *,
        item:items(id, item_name, item_code, category),
        branch:branches(id, name, document_prefix)
      `, { count: 'exact' })
      .eq('company_id', company_id)

    // Apply filters
    if (item_id) {
      query = query.eq('item_id', item_id)
    }

    if (branch_id) {
      query = query.eq('branch_id', branch_id)
    }

    if (movement_type) {
      query = query.eq('movement_type', movement_type)
    }

    if (reference_type) {
      query = query.eq('reference_type', reference_type)
    }

    if (date_from) {
      query = query.gte('movement_date', date_from)
    }

    if (date_to) {
      query = query.lte('movement_date', date_to)
    }

    if (search && search.trim()) {
      const searchTerm = search.trim()
      query = query.or(`
        item_code.ilike.%${searchTerm}%,
        reference_number.ilike.%${searchTerm}%,
        notes.ilike.%${searchTerm}%
      `)
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const offset = (pageNum - 1) * limitNum

    query = query
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1)

    const { data: movements, error, count } = await query

    if (error) {
      console.error('Error fetching movements:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch movements'
      })
    }

    // Calculate statistics
    const stats = {
      total_movements: count,
      total_in: movements?.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + parseFloat(m.quantity), 0) || 0,
      total_out: movements?.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + parseFloat(m.quantity), 0) || 0,
      total_adjustments: movements?.filter(m => m.movement_type === 'adjustment').length || 0
    }

    const totalPages = Math.ceil(count / limitNum)

    return res.status(200).json({
      success: true,
      data: movements,
      statistics: stats,
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
    console.error('Error in getMovements:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch movements'
    })
  }
}

async function createMovement(req, res) {
  const { 
    company_id,
    item_id,
    branch_id, // NEW: Track branch
    movement_type,
    quantity,
    rate,
    reference_type,
    reference_number,
    location,
    notes,
    movement_date
  } = req.body

  if (!company_id || !item_id || !movement_type || !quantity) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
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
    // Get item
    const { data: item, error: itemError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', item_id)
      .eq('company_id', company_id)
      .single()

    if (itemError || !item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      })
    }

    if (!item.track_inventory) {
      return res.status(400).json({
        success: false,
        error: 'Item does not track inventory'
      })
    }

    // Calculate new stock
    const currentStock = parseFloat(item.current_stock) || 0
    const quantityValue = parseFloat(quantity)
    let newStock

    if (movement_type === 'in') {
      newStock = currentStock + quantityValue
    } else if (movement_type === 'out') {
      if (currentStock < quantityValue) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock. Available: ${currentStock}, Required: ${quantityValue}`
        })
      }
      newStock = currentStock - quantityValue
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid movement type'
      })
    }

    // Create movement record
    const { data: movement, error: movementError } = await supabaseAdmin
      .from('inventory_movements')
      .insert({
        company_id,
        item_id,
        item_code: item.item_code,
        branch_id: branch_id || null, // NEW: Store branch
        movement_type,
        quantity: quantityValue,
        rate: rate ? parseFloat(rate) : null,
        value: rate ? quantityValue * parseFloat(rate) : null,
        reference_type: reference_type || 'manual_adjustment',
        reference_number: reference_number || `MOV-${Date.now()}`,
        stock_before: currentStock,
        stock_after: newStock,
        location: location?.trim() || null,
        notes: notes?.trim() || null,
        movement_date: movement_date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (movementError) {
      console.error('Error creating movement:', movementError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create movement'
      })
    }

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
      // Rollback movement
      await supabaseAdmin
        .from('inventory_movements')
        .delete()
        .eq('id', movement.id)

      return res.status(500).json({
        success: false,
        error: 'Failed to update stock'
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Movement recorded successfully',
      data: {
        movement_id: movement.id,
        item_id,
        old_stock: currentStock,
        new_stock: newStock,
        quantity: quantityValue,
        movement_type,
        branch_id: branch_id || null
      }
    })

  } catch (error) {
    console.error('Error in createMovement:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create movement'
    })
  }
}

export default withAuth(handler)