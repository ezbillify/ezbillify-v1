// pages/api/items/import-template.js
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
    // Get reference data
    const [units, taxRates] = await Promise.all([
      getUnits(company_id),
      getTaxRates(company_id)
    ])

    // Main template headers
    const mainHeaders = {
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
      primary_unit_name: 'Primary Unit Name (see Units sheet)',
      secondary_unit_name: 'Secondary Unit Name (see Units sheet)',
      conversion_factor: 'Conversion Factor',
      hsn_sac_code: 'HSN/SAC Code',
      tax_rate_name: 'Tax Rate Name (see Tax Rates sheet)',
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

    // Units reference data
    const unitsData = units.map(unit => ({
      unit_name: unit.unit_name,
      unit_symbol: unit.unit_symbol,
      unit_id: unit.id
    }))

    // Tax rates reference data
    const taxRatesData = taxRates.map(rate => ({
      tax_rate_name: rate.tax_name,
      tax_percentage: rate.tax_rate,
      tax_rate_id: rate.id
    }))

    // Create multi-sheet CSV (using CSV comments to separate sheets)
    let csvContent = ''

    // Main template
    csvContent += '# MAIN TEMPLATE - Fill in your item data below\n'
    csvContent += '# Note: Do not modify the header row\n'
    csvContent += '# item_code is auto-generated and should NOT be included\n'
    csvContent += '# Use unit names from the Units sheet and tax rate names from the Tax Rates sheet\n\n'
    csvContent += stringify([mainHeaders], {
      header: true,
      columns: Object.keys(mainHeaders)
    })

    // Sample data row
    csvContent += '\n# SAMPLE ROW (remove before importing)\n'
    const sampleRow = {
      item_name: 'Sample Product',
      display_name: 'Sample Product',
      print_name: 'Sample Product',
      description: 'This is a sample product description',
      item_type: 'product',
      category: 'Electronics',
      brand: 'Sample Brand',
      selling_price: '1000.00',
      selling_price_with_tax: '1180.00',
      purchase_price: '800.00',
      mrp: '1200.00',
      primary_unit_name: 'Pieces',
      secondary_unit_name: '',
      conversion_factor: '1.00',
      hsn_sac_code: '123456',
      tax_rate_name: 'GST 18%',
      tax_preference: 'taxable',
      track_inventory: 'true',
      current_stock: '100',
      reserved_stock: '0',
      reorder_level: '20',
      max_stock_level: '200',
      barcode: '1234567890123',
      is_active: 'true',
      is_for_sale: 'true',
      is_for_purchase: 'true'
    }
    csvContent += stringify([sampleRow], {
      header: false,
      columns: Object.keys(mainHeaders)
    })

    // Units reference
    csvContent += '\n\n# UNITS REFERENCE - Use these unit names in your import\n'
    csvContent += '# Do not modify this section\n\n'
    if (unitsData.length > 0) {
      csvContent += stringify(unitsData, {
        header: true,
        columns: ['unit_name', 'unit_symbol', 'unit_id']
      })
    } else {
      csvContent += 'unit_name,unit_symbol,unit_id\n'
      csvContent += 'Pieces,PCS,\n'
      csvContent += 'Box,BOX,\n'
      csvContent += 'Kilogram,KGS,\n'
      csvContent += 'Meter,MTR,\n'
    }

    // Tax rates reference
    csvContent += '\n\n# TAX RATES REFERENCE - Use these tax rate names in your import\n'
    csvContent += '# Do not modify this section\n\n'
    if (taxRatesData.length > 0) {
      csvContent += stringify(taxRatesData, {
        header: true,
        columns: ['tax_rate_name', 'tax_percentage', 'tax_rate_id']
      })
    } else {
      csvContent += 'tax_rate_name,tax_percentage,tax_rate_id\n'
      csvContent += 'GST 0%,0.00,\n'
      csvContent += 'GST 5%,5.00,\n'
      csvContent += 'GST 12%,12.00,\n'
      csvContent += 'GST 18%,18.00,\n'
      csvContent += 'GST 28%,28.00,\n'
    }

    // Instructions
    csvContent += '\n\n# INSTRUCTIONS\n'
    csvContent += '# 1. Fill in your item data in the main template section above\n'
    csvContent += '# 2. Use unit names from the Units reference section (not IDs)\n'
    csvContent += '# 3. Use tax rate names from the Tax Rates reference section (not IDs)\n'
    csvContent += '# 4. Remove the sample row before importing\n'
    csvContent += '# 5. Do not modify the header row\n'
    csvContent += '# 6. Save as CSV and upload through the import interface\n'
    csvContent += '# 7. item_code will be auto-generated (PRD-001, PRD-002, etc.)\n'

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="item-import-template-${new Date().toISOString().split('T')[0]}.csv"`)

    // Send CSV data
    res.status(200).send(csvContent)

  } catch (error) {
    console.error('Error generating template:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Helper functions
async function getUnits(company_id) {
  const { data } = await supabaseAdmin
    .from('units')
    .select('id, unit_name, unit_symbol')
    .or(`company_id.is.null,company_id.eq.${company_id}`)
  return data || []
}

async function getTaxRates(company_id) {
  const { data } = await supabaseAdmin
    .from('tax_rates')
    .select('id, tax_name, tax_rate')
    .eq('company_id', company_id)
  return data || []
}

export default withAuth(handler)