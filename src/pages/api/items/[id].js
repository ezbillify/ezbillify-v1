// src/pages/api/items/[id].js - UPDATED: Simplified location as text
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
        return await getItem(req, res)
      case 'PUT':
        return await updateItem(req, res)
      case 'DELETE':
        return await softDeleteItem(req, res)
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
      error: 'Internal server error'
    })
  }
}

async function getItem(req, res) {
  const { id } = req.query
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    const { data: item, error } = await supabaseAdmin
      .from('items')
      .select(`
        *,
        primary_unit:primary_unit_id(*),
        secondary_unit:secondary_unit_id(*),
        tax_rate:tax_rate_id(*),
        category_data:category_id(id, category_name)
      `)
      .eq('id', id)
      .eq('company_id', company_id)
      .is('deleted_at', null)
      .single()

    if (error || !item) {
      console.error('Error fetching item:', error)
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      })
    }

    return res.status(200).json({
      success: true,
      data: item
    })

  } catch (error) {
    console.error('Error in getItem:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch item'
    })
  }
}

async function updateItem(req, res) {
  const { id } = req.query
  const {
    company_id,
    item_name,
    print_name,
    display_name,
    description,
    category,
    category_id, // Accept category_id (foreign key to categories table)
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
    reorder_level,
    max_stock_level,
    barcode,
    location, // UPDATED: Simple text location
    is_active,
    is_for_sale,
    is_for_purchase
  } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Verify item exists
    const { data: existingItem, error: fetchError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', id)
      .eq('company_id', company_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingItem) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      })
    }

    // Prepare update data
    const updateData = {
      ...(item_name && { item_name: item_name.trim() }),
      ...(print_name && { print_name: print_name.trim() }),
      ...(display_name && { display_name: display_name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(category && { category: category.trim() }),
      ...(category_id !== undefined && { category_id: category_id || null }), // Save category_id (foreign key)
      ...(brand && { brand: brand.trim() }),
      ...(selling_price !== undefined && { selling_price: parseFloat(selling_price) || 0 }),
      ...(selling_price_with_tax !== undefined && { selling_price_with_tax: parseFloat(selling_price_with_tax) || 0 }),
      ...(purchase_price !== undefined && { purchase_price: parseFloat(purchase_price) || 0 }),
      ...(mrp !== undefined && { mrp: mrp ? parseFloat(mrp) : null }),
      ...(primary_unit_id && { primary_unit_id }),
      ...(secondary_unit_id && { secondary_unit_id }),
      ...(conversion_factor !== undefined && { conversion_factor: parseFloat(conversion_factor) || 1 }),
      ...(hsn_sac_code && { hsn_sac_code: hsn_sac_code.trim() }),
      ...(tax_rate_id && { tax_rate_id }),
      ...(tax_preference && { tax_preference }),
      ...(reorder_level !== undefined && { reorder_level: parseFloat(reorder_level) || 0 }),
      ...(max_stock_level !== undefined && { max_stock_level: max_stock_level ? parseFloat(max_stock_level) : null }),
      ...(barcode && { barcode: barcode.trim() }),
      ...(location !== undefined && { location: location?.trim() || null }), // UPDATED: Store location
      ...(is_active !== undefined && { is_active }),
      ...(is_for_sale !== undefined && { is_for_sale }),
      ...(is_for_purchase !== undefined && { is_for_purchase }),
      updated_at: new Date().toISOString()
    }

    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('items')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', company_id)
      .select(`
        *,
        primary_unit:primary_unit_id(*),
        secondary_unit:secondary_unit_id(*),
        tax_rate:tax_rate_id(*),
        category_data:category_id(id, category_name)
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

  } catch (error) {
    console.error('Error in updateItem:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update item'
    })
  }
}

async function softDeleteItem(req, res) {
  const { id } = req.query
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Verify item exists
    const { data: existingItem, error: fetchError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', id)
      .eq('company_id', company_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingItem) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      })
    }

    // Soft delete by setting deleted_at
    const { error: deleteError } = await supabaseAdmin
      .from('items')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting item:', deleteError)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete item'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Item deleted successfully'
    })

  } catch (error) {
    console.error('Error in softDeleteItem:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete item'
    })
  }
}

export default withAuth(handler)