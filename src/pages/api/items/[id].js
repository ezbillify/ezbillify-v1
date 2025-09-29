// pages/api/items/[id].js
import { supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Item ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getItem(req, res, id)
      case 'PUT':
        return await updateItem(req, res, id)
      case 'DELETE':
        return await deleteItem(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Item API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getItem(req, res, itemId) {
  const { company_id, include_movements = false } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Base item query with relationships
  const { data: item, error } = await supabaseAdmin
    .from('items')
    .select(`
      *,
      primary_unit:units!items_primary_unit_id_fkey(id, unit_name, unit_symbol),
      secondary_unit:units!items_secondary_unit_id_fkey(id, unit_name, unit_symbol),
      tax_rate:tax_rates(id, tax_name, tax_rate, cgst_rate, sgst_rate, igst_rate)
    `)
    .eq('id', itemId)
    .eq('company_id', company_id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      })
    }
    
    console.error('Error fetching item:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch item'
    })
  }

  let itemData = item

  // Include inventory movements if requested
  if (include_movements === 'true') {
    const movements = await getItemMovements(itemId, 20) // Last 20 movements
    const stats = await getItemStatistics(itemId)
    
    itemData = {
      ...item,
      inventory_movements: movements,
      statistics: stats
    }
  }

  return res.status(200).json({
    success: true,
    data: itemData
  })
}

async function updateItem(req, res, itemId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if item exists
  const { data: existingItem, error: fetchError } = await supabaseAdmin
    .from('items')
    .select('*')
    .eq('id', itemId)
    .eq('company_id', company_id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch item'
    })
  }

  // Validate item type if provided
  if (req.body.item_type && !['product', 'service'].includes(req.body.item_type)) {
    return res.status(400).json({
      success: false,
      error: 'Item type must be either product or service'
    })
  }

  // Validate tax preference if provided
  if (req.body.tax_preference && !['taxable', 'exempt', 'nil_rated'].includes(req.body.tax_preference)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid tax preference'
    })
  }

  // Check for duplicate item code or barcode (excluding current item)
  if (req.body.item_code || req.body.barcode) {
    const conditions = []
    if (req.body.item_code) conditions.push(`item_code.eq.${req.body.item_code}`)
    if (req.body.barcode) conditions.push(`barcode.eq.${req.body.barcode}`)

    if (conditions.length > 0) {
      const { data: duplicates } = await supabaseAdmin
        .from('items')
        .select('id, item_code, barcode')
        .eq('company_id', company_id)
        .neq('id', itemId)
        .or(conditions.join(','))
      
      if (duplicates && duplicates.length > 0) {
        const duplicate = duplicates[0]
        if (duplicate.item_code === req.body.item_code) {
          return res.status(400).json({
            success: false,
            error: 'Another item with this code already exists'
          })
        }
        if (duplicate.barcode === req.body.barcode) {
          return res.status(400).json({
            success: false,
            error: 'Another item with this barcode already exists'
          })
        }
      }
    }
  }

  // Validate tax rate if provided
  if (req.body.tax_rate_id) {
    const { data: taxRate } = await supabaseAdmin
      .from('tax_rates')
      .select('id')
      .eq('id', req.body.tax_rate_id)
      .eq('company_id', company_id)
      .single()

    if (!taxRate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tax rate ID'
      })
    }
  }

  // Prepare update data
  const allowedFields = [
    'item_code', 'item_name', 'print_name', 'display_name', 'description', 'item_type', 'category', 'brand',
    'selling_price', 'selling_price_with_tax', 'purchase_price', 'mrp', 'primary_unit_id', 'secondary_unit_id', 'conversion_factor',
    'hsn_sac_code', 'tax_rate_id', 'tax_preference', 'track_inventory', 'reorder_level', 'max_stock_level',
    'barcode', 'images', 'specifications', 'is_active', 'is_for_sale', 'is_for_purchase'
  ]

  const updateData = {}
  
  allowedFields.forEach(field => {
    if (req.body.hasOwnProperty(field)) {
      let value = req.body[field]
      
      // Type-specific processing
      if (['item_name', 'print_name', 'display_name', 'description', 'category', 'brand'].includes(field) && value) {
        value = value.trim()
      } else if (['selling_price', 'selling_price_with_tax', 'purchase_price', 'mrp', 'conversion_factor', 'reorder_level', 'max_stock_level'].includes(field)) {
        value = value ? parseFloat(value) : (field === 'conversion_factor' ? 1 : 0)
      } else if (['barcode', 'hsn_sac_code'].includes(field) && value) {
        value = value.trim()
      }
      
      updateData[field] = value
    }
  })

  // Handle inventory tracking changes
  if (req.body.hasOwnProperty('track_inventory')) {
    const trackInventory = req.body.track_inventory === true || req.body.track_inventory === 'true'
    updateData.track_inventory = trackInventory
    
    // If disabling inventory tracking, clear inventory fields
    if (!trackInventory) {
      updateData.current_stock = 0
      updateData.reserved_stock = 0
      updateData.available_stock = 0
      updateData.reorder_level = null
      updateData.max_stock_level = null
    }
  }

  // Handle stock adjustments (if provided and inventory tracking is enabled)
  const stockAdjustment = req.body.stock_adjustment
  if (stockAdjustment && existingItem.track_inventory) {
    const { type, quantity, reason, reference_number } = stockAdjustment
    
    if (!['adjustment', 'in', 'out'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stock adjustment type'
      })
    }
    
    if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stock adjustment quantity'
      })
    }
    
    const adjustmentQty = parseFloat(quantity)
    let newStock
    
    if (type === 'adjustment') {
      newStock = adjustmentQty // Direct set
    } else if (type === 'in') {
      newStock = existingItem.current_stock + adjustmentQty
    } else { // 'out'
      newStock = Math.max(0, existingItem.current_stock - adjustmentQty)
    }
    
    updateData.current_stock = newStock
    updateData.available_stock = Math.max(0, newStock - (existingItem.reserved_stock || 0))
    
    // Create inventory movement record
    await createInventoryMovement(company_id, itemId, {
      movement_type: type,
      quantity: type === 'adjustment' ? Math.abs(newStock - existingItem.current_stock) : adjustmentQty,
      reference_type: 'manual_adjustment',
      reference_number: reference_number || `ADJ-${Date.now()}`,
      stock_before: existingItem.current_stock,
      stock_after: newStock,
      notes: reason || 'Manual stock adjustment'
    })
  }

  // Add timestamp
  updateData.updated_at = new Date().toISOString()

  // If this is a VeeKaart product update, update sync timestamp
  if (existingItem.veekaart_product_id) {
    updateData.veekaart_last_sync = new Date().toISOString()
  }

  const { data: updatedItem, error: updateError } = await supabaseAdmin
    .from('items')
    .update(updateData)
    .eq('id', itemId)
    .select(`
      *,
      primary_unit:units!items_primary_unit_id_fkey(id, unit_name, unit_symbol),
      secondary_unit:units!items_secondary_unit_id_fkey(id, unit_name, unit_symbol),
      tax_rate:tax_rates(id, tax_name, tax_rate, cgst_rate, sgst_rate, igst_rate)
    `)
    .single()

  if (updateError) {
    console.error('Error updating item:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update item'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Item updated successfully',
    data: updatedItem
  })
}

async function deleteItem(req, res, itemId) {
  const { company_id, force = false } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if item exists
  const { data: item, error: fetchError } = await supabaseAdmin
    .from('items')
    .select('id, item_name, item_code')
    .eq('id', itemId)
    .eq('company_id', company_id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch item'
    })
  }

  // Check if item has related transactions (unless forced)
  if (!force) {
    const [salesItems, purchaseItems] = await Promise.all([
      supabaseAdmin
        .from('sales_document_items')
        .select('id')
        .eq('item_id', itemId)
        .limit(1),
      supabaseAdmin
        .from('purchase_document_items')
        .select('id')
        .eq('item_id', itemId)
        .limit(1)
    ])

    if ((salesItems.data && salesItems.data.length > 0) || 
        (purchaseItems.data && purchaseItems.data.length > 0)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete item with existing transactions. Use force=true to override.',
        has_transactions: true
      })
    }
  }

  // Soft delete (mark as inactive) rather than hard delete
  const { error: deleteError } = await supabaseAdmin
    .from('items')
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)

  if (deleteError) {
    console.error('Error deleting item:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete item'
    })
  }

  return res.status(200).json({
    success: true,
    message: `Item "${item.item_name}" (${item.item_code}) deleted successfully`
  })
}

async function getItemMovements(itemId, limit = 20) {
  try {
    const { data: movements } = await supabaseAdmin
      .from('inventory_movements')
      .select('*')
      .eq('item_id', itemId)
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    return movements || []
  } catch (error) {
    console.error('Error fetching item movements:', error)
    return []
  }
}

async function getItemStatistics(itemId) {
  try {
    // Get movement statistics
    const { data: movements } = await supabaseAdmin
      .from('inventory_movements')
      .select('movement_type, quantity, value')
      .eq('item_id', itemId)

    if (!movements) return null

    const stats = {
      total_movements: movements.length,
      total_in: movements.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + (parseFloat(m.quantity) || 0), 0),
      total_out: movements.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + (parseFloat(m.quantity) || 0), 0),
      total_adjustments: movements.filter(m => m.movement_type === 'adjustment').length,
      total_value: movements.reduce((sum, m) => sum + (parseFloat(m.value) || 0), 0)
    }

    // Get sales statistics
    const { data: salesData } = await supabaseAdmin
      .from('sales_document_items')
      .select('quantity, total_amount')
      .eq('item_id', itemId)

    if (salesData) {
      stats.total_sold = salesData.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)
      stats.total_sales_value = salesData.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0)
    }

    // Get purchase statistics
    const { data: purchaseData } = await supabaseAdmin
      .from('purchase_document_items')
      .select('quantity, total_amount')
      .eq('item_id', itemId)

    if (purchaseData) {
      stats.total_purchased = purchaseData.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)
      stats.total_purchase_value = purchaseData.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0)
    }

    return stats
  } catch (error) {
    console.error('Error fetching item statistics:', error)
    return null
  }
}

async function createInventoryMovement(company_id, item_id, movementData) {
  try {
    const { data: item } = await supabaseAdmin
      .from('items')
      .select('item_code')
      .eq('id', item_id)
      .single()

    await supabaseAdmin
      .from('inventory_movements')
      .insert({
        company_id,
        item_id,
        item_code: item?.item_code || 'UNKNOWN',
        movement_type: movementData.movement_type,
        quantity: movementData.quantity,
        rate: movementData.rate || null,
        value: movementData.value || null,
        reference_type: movementData.reference_type,
        reference_id: movementData.reference_id || null,
        reference_number: movementData.reference_number,
        stock_before: movementData.stock_before,
        stock_after: movementData.stock_after,
        location: movementData.location || null,
        notes: movementData.notes,
        movement_date: movementData.movement_date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error creating inventory movement:', error)
  }
}

export default withAuth(handler)
