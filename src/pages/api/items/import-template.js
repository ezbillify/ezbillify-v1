// pages/api/items/import-template.js
import { withAuth } from '../../../lib/middleware'
import { stringify } from 'csv-stringify/sync'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // Define template headers (item_code is auto-generated)
    const headers = {
      item_name: 'Item Name *',
      display_name: 'Display Name',
      print_name: 'Print Name',
      description: 'Description',
      item_type: 'Item Type (product/service)',
      category: 'Category',
      brand: 'Brand',
      selling_price: 'Selling Price',
      selling_price_with_tax: 'Selling Price With Tax',
      purchase_price: 'Purchase Price',
      mrp: 'MRP',
      primary_unit_id: 'Primary Unit ID',
      secondary_unit_id: 'Secondary Unit ID',
      conversion_factor: 'Conversion Factor',
      hsn_sac_code: 'HSN/SAC Code',
      tax_rate_id: 'Tax Rate ID',
      tax_preference: 'Tax Preference (taxable/exempt/out_of_scope)',
      track_inventory: 'Track Inventory (true/false)',
      current_stock: 'Current Stock',
      reserved_stock: 'Reserved Stock',
      reorder_level: 'Reorder Level',
      max_stock_level: 'Max Stock Level',
      barcode: 'Barcode',
      is_active: 'Is Active (true/false)',
      is_for_sale: 'For Sale (true/false)',
      is_for_purchase: 'For Purchase (true/false)'
      // Note: item_code is auto-generated and should NOT be included in imports
    }

    // Generate CSV template
    const csv = stringify([headers], {
      header: true,
      columns: Object.keys(headers)
    })

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="item-import-template.csv"')

    // Send CSV data
    res.status(200).send(csv)

  } catch (error) {
    console.error('Error generating template:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate template'
    })
  }
}

export default withAuth(handler)