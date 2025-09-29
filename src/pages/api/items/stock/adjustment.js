// pages/api/items/stock/adjustment.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'POST':
        return await createStockAdjustment(req, res)
      case 'GET':
        return await getStockAdjustments(req, res)
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
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function createStockAdjustment(req, res) {
  const {
    company_id,
    adjustments,
    reason,
    reference_number,
    adjustment_date
  } = req.body

  if (!company_id || !adjustments || !Array.isArray(adjustments)) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and adjustments array are required'
    })
  }

  if (adjustments.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one adjustment is required'
    })
  }

  // Validate all adjustments before processing
  const validationErrors = []
  for (let i = 0; i < adjustments.length; i++) {
    const adj = adjustments[i]
    
    if (!adj.item_id || adj.new_stock === undefined || adj.new_stock === null) {
      validationErrors.push(`Adjustment ${i + 1}: Item ID and new stock are required`)
    }
    
    if (adj.new_stock < 0) {
      validationErrors.push(`Adjustment ${i + 1}: Stock cannot be negative`)
    }
    
    if (isNaN(parseFloat(adj.new_stock))) {
      validationErrors.push(`Adjustment ${i + 1}: Invalid stock value`)
    }
  }

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: validationErrors
    })
  }

  // Process adjustments
  const results = []
  const errors = []
  const movementIds = []

  for (const adjustment of adjustments) {
    try {
      const { item_id, new_stock, item_reason } = adjustment
      const newStockValue = parseFloat(new_stock)

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

      const currentStock = parseFloat(item.current_stock) || 0
      const stockDifference = newStockValue - currentStock

      // Skip if no change
      if (stockDifference === 0) {
        results.push({
          item_id,
          item_code: item.item_code,
          item_name: item.item_name,
          old_stock: currentStock,
          new_stock: newStockValue,
          difference: 0,
          status: 'no_change'
        })
        continue
      }

      // Update item stock
      const { error: updateError } = await supabaseAdmin
        .from('items')
        .update({
          current_stock: newStockValue,
          available_stock: Math.max(0, newStockValue - (parseFloat(item.reserved_stock) || 0)),
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
      const movementType = stockDifference > 0 ? 'in' : 'out'
      const quantity = Math.abs(stockDifference)
      
      const { data: movement, error: movementError } = await supabaseAdmin
        .from('inventory_movements')
        .insert({
          company_id,
          item_id,
          item_code: item.item_code,
          movement_type: 'adjustment',
          quantity,
          reference_type: 'stock_adjustment',
          reference_number: reference_number || `ADJ-${Date.now()}`,
          stock_before: currentStock,
          stock_after: newStockValue,
          movement_date: adjustment_date || new Date().toISOString().split('T')[0],
          notes: item_reason || reason || 'Stock adjustment',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (movementError) {
        console.error('Error creating movement record:', movementError)
        // Don't fail the adjustment for movement logging errors
      } else {
        movementIds.push(movement.id)
      }

      // Notify VeeKaart if integrated
      if (item.veekaart_product_id) {
        await notifyVeeKaartStockUpdate(company_id, item.veekaart_product_id, newStockValue)
      }

      results.push({
        item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        old_stock: currentStock,
        new_stock: newStockValue,
        difference: stockDifference,
        movement_type: movementType,
        status: 'adjusted'
      })

    } catch (error) {
      console.error(`Error adjusting stock for item ${adjustment.item_id}:`, error)
      errors.push({
        item_id: adjustment.item_id,
        error: error.message
      })
    }
  }

  // Create adjustment batch record for audit trail
  if (results.length > 0) {
    await supabaseAdmin
      .from('stock_adjustment_batches')
      .insert({
        company_id,
        reference_number: reference_number || `BATCH-ADJ-${Date.now()}`,
        reason,
        adjustment_date: adjustment_date || new Date().toISOString().split('T')[0],
        items_adjusted: results.length,
        total_value_change: results.reduce((sum, r) => sum + (r.difference * parseFloat(r.selling_price || 0)), 0),
        movement_ids: movementIds,
        created_at: new Date().toISOString()
      })
  }

  const success = errors.length === 0
  const statusCode = success ? 200 : (results.length > 0 ? 207 : 400) // 207 = Partial success

  return res.status(statusCode).json({
    success,
    message: `${results.length} items adjusted successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
    data: {
      successful_adjustments: results,
      failed_adjustments: errors.length > 0 ? errors : undefined,
      summary: {
        total_requested: adjustments.length,
        successful: results.length,
        failed: errors.length,
        no_change: results.filter(r => r.status === 'no_change').length
      }
    }
  })
}

async function getStockAdjustments(req, res) {
  const { 
    company_id,
    item_id,
    date_from,
    date_to,
    reference_number,
    page = 1,
    limit = 50
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Build query for adjustment movements
  let query = supabaseAdmin
    .from('inventory_movements')
    .select(`
      *,
      item:items(id, item_name, item_code, category, selling_price)
    `, { count: 'exact' })
    .eq('company_id', company_id)
    .eq('movement_type', 'adjustment')

  // Apply filters
  if (item_id) {
    query = query.eq('item_id', item_id)
  }

  if (reference_number) {
    query = query.ilike('reference_number', `%${reference_number}%`)
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
    console.error('Error fetching stock adjustments:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stock adjustments'
    })
  }

  // Calculate adjustment statistics
  const stats = {
    total_adjustments: count,
    total_quantity: adjustments?.reduce((sum, adj) => sum + parseFloat(adj.quantity), 0) || 0,
    positive_adjustments: adjustments?.filter(adj => adj.stock_after > adj.stock_before).length || 0,
    negative_adjustments: adjustments?.filter(adj => adj.stock_after < adj.stock_before).length || 0
  }

  // Pagination info
  const totalPages = Math.ceil(count / limitNum)

  return res.status(200).json({
    success: true,
    data: adjustments,
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
    await fetch(`${apiConfig.api_url}/api/products/stock`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiConfig.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: veekaart_product_id,
        stock_quantity: new_stock,
        updated_by: 'ezbillify_adjustment',
        timestamp: new Date().toISOString()
      })
    })

  } catch (error) {
    console.error('Error notifying VeeKaart of stock adjustment:', error)
  }
}

export default withAuth(handler)