// pages/api/items/export.js
import { withAuth } from '../../../lib/middleware'
import { supabaseAdmin } from '../../../services/utils/supabase'
import { stringify } from 'csv-stringify/sync'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Fetch all items for the company using admin client
    const { data: items, error } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('company_id', company_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    // Transform item data for export
    const exportData = items.map(item => ({
      item_code: item.item_code || '',
      item_name: item.item_name || '',
      display_name: item.display_name || '',
      print_name: item.print_name || '',
      description: item.description || '',
      item_type: item.item_type || 'product',
      category: item.category || '',
      brand: item.brand || '',
      selling_price: item.selling_price || 0,
      selling_price_with_tax: item.selling_price_with_tax || 0,
      purchase_price: item.purchase_price || 0,
      mrp: item.mrp || '',
      primary_unit_id: item.primary_unit_id || '',
      secondary_unit_id: item.secondary_unit_id || '',
      conversion_factor: item.conversion_factor || 1,
      hsn_sac_code: item.hsn_sac_code || '',
      tax_rate_id: item.tax_rate_id || '',
      tax_preference: item.tax_preference || 'taxable',
      track_inventory: item.track_inventory ? 'true' : 'false',
      current_stock: item.current_stock || 0,
      reserved_stock: item.reserved_stock || 0,
      available_stock: item.available_stock || 0,
      reorder_level: item.reorder_level || 0,
      max_stock_level: item.max_stock_level || '',
      barcode: item.barcode || '',
      is_active: item.is_active ? 'true' : 'false',
      is_for_sale: item.is_for_sale ? 'true' : 'false',
      is_for_purchase: item.is_for_purchase ? 'true' : 'false',
      created_at: item.created_at || '',
      updated_at: item.updated_at || ''
    }))

    // Convert to CSV
    const csv = stringify(exportData, {
      header: true,
      columns: [
        'item_code',
        'item_name',
        'display_name',
        'print_name',
        'description',
        'item_type',
        'category',
        'brand',
        'selling_price',
        'selling_price_with_tax',
        'purchase_price',
        'mrp',
        'primary_unit_id',
        'secondary_unit_id',
        'conversion_factor',
        'hsn_sac_code',
        'tax_rate_id',
        'tax_preference',
        'track_inventory',
        'current_stock',
        'reserved_stock',
        'available_stock',
        'reorder_level',
        'max_stock_level',
        'barcode',
        'is_active',
        'is_for_sale',
        'is_for_purchase',
        'created_at',
        'updated_at'
      ]
    })

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="items_${new Date().toISOString().split('T')[0]}.csv"`)

    // Send CSV data
    return res.status(200).send(csv)
  } catch (error) {
    console.error('Item export error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to export items',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)