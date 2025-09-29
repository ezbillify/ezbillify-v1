// pages/api/items/stock/movement.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getInventoryMovements(req, res)
      case 'POST':
        return await createInventoryMovement(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Inventory movements API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getInventoryMovements(req, res) {
  const { 
    company_id, 
    item_id,
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

  // Build query
  let query = supabaseAdmin
    .from('inventory_movements')
    .select(`
      *,
      item:items(id, item_name, item_code, category)
    `, { count: 'exact' })
    .eq('company_id', company_id)

  // Apply filters
  if (item_id) {
    query = query.eq('item_id', item_id)
  }

  if (movement_type) {
    const validTypes = ['in', 'out', 'adjustment', 'opening_stock', 'transfer']
    if (validTypes.includes(movement_type)) {
      query = query.eq('movement_type', movement_type)
    }
  }

  if (reference_type) {
    const validRefTypes = ['sales_document', 'purchase_document', 'manual_adjustment', 'opening_balance', 'stock_transfer', 'veekaart_sync']
    if (validRefTypes.includes(reference_type)) {
      query = query.eq('reference_type', reference_type)
    }
  }

  // Date range filter
  if (date_from) {
    query = query.gte('movement_date', date_from)
  }
  if (date_to) {
    query = query.lte('movement_date', date_to)
  }

  // Search functionality
  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      item_code.ilike.%${searchTerm}%,
      reference_number.ilike.%${searchTerm}%,
      notes.ilike.%${searchTerm}%
    `)
  }

  // Pagination and sorting
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  query = query
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limitNum - 1)

  const { data: movements, error, count } = await query

  if (error) {
    console.error('Error fetching inventory movements:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory movements'
    })
  }

  // Calculate movement statistics
  const stats = {
    total_movements: count,
    total_in: movements?.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + parseFloat(m.quantity), 0) || 0,
    total_out: movements?.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + parseFloat(m.quantity), 0) || 0,
    total_adjustments: movements?.filter(m => m.movement_type === 'adjustment').length || 0,
    total_value: movements?.reduce((sum, m) => sum + (parseFloat(m.value) || 0), 0) || 0
  }

  // Pagination info
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
}

async function createInventoryMovement(req, res) {
  const { 
    company_id,
    item_id,
    movement_type,
    quantity,
    rate,
    reference_type,
    reference_id,
    reference_number,
    location,
    notes,
    movement_date
  } = req.body

  if (!company_id || !item_id || !movement_type || !quantity) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, item ID, movement type, and quantity are required'
    })
  }

  // Validate movement type
  const validMovementTypes = ['in', 'out', 'adjustment', 'opening_stock', 'transfer']
  if (!validMovementTypes.includes(movement_type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid movement type'
    })
  }

  // Validate quantity
  const quantityValue = parseFloat(quantity)
  if (isNaN(quantityValue) || quantityValue <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Quantity must be a positive number'
    })
  }

  // Get item details
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

  // Calculate new stock level
  let newStock
  const currentStock = parseFloat(item.current_stock) || 0

  switch (movement_type) {
    case 'in':
    case 'opening_stock':
      newStock = currentStock + quantityValue
      break
    case 'out':
      newStock = Math.max(0, currentStock - quantityValue)
      if (currentStock < quantityValue) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock. Available: ${currentStock}, Required: ${quantityValue}`
        })
      }
      break
    case 'adjustment':
      newStock = quantityValue // Direct set for adjustments
      break
    case 'transfer':
      // For transfers, this would typically involve two movements
      // For now, treating as 'out' movement
      newStock = Math.max(0, currentStock - quantityValue)
      break
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid movement type'
      })
  }

  // Create inventory movement record
  const movementData = {
    company_id,
    item_id,
    item_code: item.item_code,
    movement_type,
    quantity: quantityValue,
    rate: rate ? parseFloat(rate) : null,
    value: rate ? quantityValue * parseFloat(rate) : null,
    reference_type: reference_type || 'manual_adjustment',
    reference_id: reference_id || null,
    reference_number: reference_number || `MOV-${Date.now()}`,
    stock_before: currentStock,
    stock_after: newStock,
    location: location?.trim() || null,
    notes: notes?.trim() || null,
    movement_date: movement_date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  }

  const { data: movement, error: movementError } = await supabaseAdmin
    .from('inventory_movements')
    .insert(movementData)
    .select(`
      *,
      item:items(id, item_name, item_code, category)
    `)
    .single()

  if (movementError) {
    console.error('Error creating inventory movement:', movementError)
    return res.status(500).json({
      success: false,
      error: 'Failed to create inventory movement'
    })
  }

  // Update item stock levels
  const { error: updateError } = await supabaseAdmin
    .from('items')
    .update({
      current_stock: newStock,
      available_stock: Math.max(0, newStock - (parseFloat(item.reserved_stock) || 0)),
      updated_at: new Date().toISOString()
    })
    .eq('id', item_id)

  if (updateError) {
    console.error('Error updating item stock:', updateError)
    // Try to rollback the movement
    await supabaseAdmin
      .from('inventory_movements')
      .delete()
      .eq('id', movement.id)

    return res.status(500).json({
      success: false,
      error: 'Failed to update item stock levels'
    })
  }

  // Notify VeeKaart if this item is synced
  if (item.veekaart_product_id) {
    await notifyVeeKaartStockUpdate(company_id, item.veekaart_product_id, newStock)
  }

  return res.status(201).json({
    success: true,
    message: 'Inventory movement created successfully',
    data: {
      ...movement,
      stock_updated: {
        old_stock: currentStock,
        new_stock: newStock,
        difference: newStock - currentStock
      }
    }
  })
}

// VeeKaart stock update notification
async function notifyVeeKaartStockUpdate(company_id, veekaart_product_id, new_stock) {
  try {
    // Get VeeKaart integration
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('integration_type', 'veekaart')
      .eq('is_active', true)
      .single()

    if (!integration) return

    // Send stock update to VeeKaart
    const apiConfig = integration.api_config || {}
    const response = await fetch(`${apiConfig.api_url}/api/products/stock`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiConfig.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: veekaart_product_id,
        stock_quantity: new_stock,
        updated_by: 'ezbillify',
        timestamp: new Date().toISOString()
      })
    })

    // Log the notification attempt
    await supabaseAdmin
      .from('webhook_events')
      .insert({
        company_id,
        integration_id: integration.id,
        event_type: 'stock_update',
        event_data: {
          product_id: veekaart_product_id,
          new_stock: new_stock
        },
        webhook_url: `${apiConfig.api_url}/api/products/stock`,
        status: response.ok ? 'sent' : 'failed',
        response_status: response.status,
        sent_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Error notifying VeeKaart of stock update:', error)
    // Don't fail the movement for webhook errors
  }
}

export default withAuth(handler)