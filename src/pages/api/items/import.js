// pages/api/items/import.js
import { supabase } from '../../../lib/supabase'
import { withAuth } from '../../../lib/middleware/auth'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'POST':
        return await importItems(req, res)
      case 'GET':
        return await getImportHistory(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Item import API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function importItems(req, res) {
  const {
    company_id,
    items,
    update_existing = false,
    validate_only = false,
    import_source = 'manual'
  } = req.body

  if (!company_id || !items || !Array.isArray(items)) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and items array are required'
    })
  }

  if (items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one item is required'
    })
  }

  if (items.length > 1000) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 1000 items allowed per import'
    })
  }

  // Validate all items
  const validationResults = await validateItems(company_id, items, update_existing)
  
  if (validate_only) {
    return res.status(200).json({
      success: true,
      validation_only: true,
      data: validationResults
    })
  }

  if (validationResults.errors.length > 0 && !validationResults.warnings_only) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      validation: validationResults
    })
  }

  // Process import
  const importResults = await processItemImport(company_id, validationResults.valid_items, update_existing)

  // Create import log
  const importLog = {
    company_id,
    import_source,
    total_items: items.length,
    successful_imports: importResults.successful.length,
    failed_imports: importResults.failed.length,
    updated_items: importResults.updated.length,
    validation_errors: validationResults.errors.length,
    validation_warnings: validationResults.warnings.length,
    import_date: new Date().toISOString(),
    status: importResults.failed.length === 0 ? 'completed' : 'completed_with_errors'
  }

  await supabase
    .from('import_logs')
    .insert(importLog)

  const success = importResults.failed.length === 0
  const statusCode = success ? 200 : 207 // 207 = Partial success

  return res.status(statusCode).json({
    success,
    message: `Import completed: ${importResults.successful.length} created, ${importResults.updated.length} updated, ${importResults.failed.length} failed`,
    data: {
      successful: importResults.successful,
      updated: importResults.updated,
      failed: importResults.failed,
      validation: validationResults,
      summary: {
        total_processed: items.length,
        successful: importResults.successful.length,
        updated: importResults.updated.length,
        failed: importResults.failed.length
      }
    }
  })
}

async function validateItems(company_id, items, update_existing) {
  const validItems = []
  const errors = []
  const warnings = []
  const duplicates = []

  // Get existing items, units, and tax rates for validation
  const [existingItems, units, taxRates] = await Promise.all([
    getExistingItems(company_id),
    getUnits(company_id),
    getTaxRates(company_id)
  ])

  const existingItemCodes = new Set(existingItems.map(item => item.item_code))
  const existingBarcodes = new Set(existingItems.filter(item => item.barcode).map(item => item.barcode))
  const validUnitIds = new Set(units.map(unit => unit.id))
  const validTaxRateIds = new Set(taxRates.map(rate => rate.id))

  // Track duplicates within the import batch
  const batchItemCodes = new Set()
  const batchBarcodes = new Set()

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const rowNumber = i + 1
    const itemErrors = []
    const itemWarnings = []

    // Required field validation
    if (!item.item_name || !item.item_name.trim()) {
      itemErrors.push('Item name is required')
    }

    // Item code validation
    if (item.item_code) {
      const itemCode = item.item_code.trim()
      
      if (batchItemCodes.has(itemCode)) {
        itemErrors.push(`Duplicate item code in batch: ${itemCode}`)
      } else {
        batchItemCodes.add(itemCode)
        
        if (existingItemCodes.has(itemCode)) {
          if (update_existing) {
            itemWarnings.push(`Item code exists, will be updated: ${itemCode}`)
          } else {
            itemErrors.push(`Item code already exists: ${itemCode}`)
          }
        }
      }
    }

    // Barcode validation
    if (item.barcode) {
      const barcode = item.barcode.trim()
      
      if (batchBarcodes.has(barcode)) {
        itemErrors.push(`Duplicate barcode in batch: ${barcode}`)
      } else {
        batchBarcodes.add(barcode)
        
        if (existingBarcodes.has(barcode)) {
          itemErrors.push(`Barcode already exists: ${barcode}`)
        }
      }
    }

    // Item type validation
    if (item.item_type && !['product', 'service'].includes(item.item_type)) {
      itemErrors.push('Item type must be either "product" or "service"')
    }

    // Price validation
    if (item.selling_price && (isNaN(parseFloat(item.selling_price)) || parseFloat(item.selling_price) < 0)) {
      itemErrors.push('Selling price must be a valid positive number')
    }

    if (item.purchase_price && (isNaN(parseFloat(item.purchase_price)) || parseFloat(item.purchase_price) < 0)) {
      itemErrors.push('Purchase price must be a valid positive number')
    }

    // Unit validation
    if (item.primary_unit_id && !validUnitIds.has(item.primary_unit_id)) {
      itemErrors.push('Invalid primary unit ID')
    }

    if (item.secondary_unit_id && !validUnitIds.has(item.secondary_unit_id)) {
      itemErrors.push('Invalid secondary unit ID')
    }

    // Tax rate validation
    if (item.tax_rate_id && !validTaxRateIds.has(item.tax_rate_id)) {
      itemErrors.push('Invalid tax rate ID')
    }

    // Tax preference validation
    if (item.tax_preference && !['taxable', 'exempt', 'nil_rated'].includes(item.tax_preference)) {
      itemErrors.push('Tax preference must be "taxable", "exempt", or "nil_rated"')
    }

    // Stock validation
    if (item.current_stock && (isNaN(parseFloat(item.current_stock)) || parseFloat(item.current_stock) < 0)) {
      itemErrors.push('Current stock must be a valid positive number')
    }

    // HSN/SAC validation
    if (item.hsn_sac_code && (item.hsn_sac_code.length < 4 || item.hsn_sac_code.length > 8)) {
      itemWarnings.push('HSN/SAC code should be 4-8 characters')
    }

    // Track validation results
    if (itemErrors.length > 0) {
      errors.push({
        row: rowNumber,
        item_code: item.item_code || `Row ${rowNumber}`,
        errors: itemErrors
      })
    } else {
      // Process the item for import
      const processedItem = await processItemForImport(company_id, item, units)
      validItems.push({
        row: rowNumber,
        original: item,
        processed: processedItem,
        is_update: existingItemCodes.has(item.item_code)
      })
    }

    if (itemWarnings.length > 0) {
      warnings.push({
        row: rowNumber,
        item_code: item.item_code || `Row ${rowNumber}`,
        warnings: itemWarnings
      })
    }
  }

  return {
    valid_items: validItems,
    errors,
    warnings,
    warnings_only: errors.length === 0 && warnings.length > 0,
    summary: {
      total: items.length,
      valid: validItems.length,
      errors: errors.length,
      warnings: warnings.length
    }
  }
}

async function processItemForImport(company_id, item, units) {
  // Get default unit if not specified
  let primaryUnitId = item.primary_unit_id
  if (!primaryUnitId) {
    const defaultUnit = units.find(u => u.unit_symbol === 'PCS' && (u.company_id === company_id || u.company_id === null))
    primaryUnitId = defaultUnit?.id
  }

  // Generate item code if not provided
  let itemCode = item.item_code
  if (!itemCode) {
    const itemType = item.item_type || 'product'
    itemCode = await generateItemCode(company_id, itemType)
  }

  return {
    company_id,
    item_code: itemCode,
    item_name: item.item_name.trim(),
    display_name: item.display_name?.trim() || item.item_name.trim(),
    description: item.description?.trim(),
    item_type: item.item_type || 'product',
    category: item.category?.trim(),
    brand: item.brand?.trim(),
    selling_price: parseFloat(item.selling_price) || 0,
    purchase_price: parseFloat(item.purchase_price) || 0,
    mrp: item.mrp ? parseFloat(item.mrp) : null,
    primary_unit_id: primaryUnitId,
    secondary_unit_id: item.secondary_unit_id || null,
    conversion_factor: item.conversion_factor ? parseFloat(item.conversion_factor) : 1,
    hsn_sac_code: item.hsn_sac_code?.trim(),
    tax_rate_id: item.tax_rate_id || null,
    tax_preference: item.tax_preference || 'taxable',
    track_inventory: item.track_inventory === true || item.track_inventory === 'true',
    current_stock: parseFloat(item.current_stock) || 0,
    reserved_stock: parseFloat(item.reserved_stock) || 0,
    available_stock: Math.max(0, (parseFloat(item.current_stock) || 0) - (parseFloat(item.reserved_stock) || 0)),
    reorder_level: item.reorder_level ? parseFloat(item.reorder_level) : null,
    max_stock_level: item.max_stock_level ? parseFloat(item.max_stock_level) : null,
    barcode: item.barcode?.trim(),
    images: item.images || [],
    specifications: item.specifications || {},
    is_active: item.is_active !== false,
    is_for_sale: item.is_for_sale !== false,
    is_for_purchase: item.is_for_purchase !== false,
    veekaart_product_id: item.veekaart_product_id,
    veekaart_last_sync: item.veekaart_product_id ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

async function processItemImport(company_id, validItems, updateExisting) {
  const successful = []
  const updated = []
  const failed = []

  for (const validItem of validItems) {
    try {
      const { processed, is_update, row } = validItem

      if (is_update && updateExisting) {
        // Update existing item
        const { data: updatedItem, error } = await supabase
          .from('items')
          .update(processed)
          .eq('item_code', processed.item_code)
          .eq('company_id', company_id)
          .select()
          .single()

        if (error) {
          failed.push({
            row,
            item_code: processed.item_code,
            error: error.message
          })
        } else {
          updated.push({
            row,
            item_code: processed.item_code,
            item_name: processed.item_name,
            item_id: updatedItem.id
          })
        }
      } else if (!is_update) {
        // Create new item
        const { data: newItem, error } = await supabase
          .from('items')
          .insert(processed)
          .select()
          .single()

        if (error) {
          failed.push({
            row,
            item_code: processed.item_code,
            error: error.message
          })
        } else {
          successful.push({
            row,
            item_code: processed.item_code,
            item_name: processed.item_name,
            item_id: newItem.id
          })

          // Create opening stock movement if applicable
          if (processed.track_inventory && processed.current_stock > 0) {
            await createOpeningStockMovement(company_id, newItem.id, processed)
          }
        }
      }
    } catch (error) {
      failed.push({
        row: validItem.row,
        item_code: validItem.processed.item_code,
        error: error.message
      })
    }
  }

  return { successful, updated, failed }
}

async function createOpeningStockMovement(company_id, item_id, itemData) {
  try {
    await supabase
      .from('inventory_movements')
      .insert({
        company_id,
        item_id,
        item_code: itemData.item_code,
        movement_type: 'opening_stock',
        quantity: itemData.current_stock,
        reference_type: 'import',
        reference_number: 'IMPORT-OPENING',
        stock_before: 0,
        stock_after: itemData.current_stock,
        movement_date: new Date().toISOString().split('T')[0],
        notes: 'Opening stock from import',
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error creating opening stock movement:', error)
  }
}

async function getImportHistory(req, res) {
  const { company_id, page = 1, limit = 20 } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  const { data: imports, error, count } = await supabase
    .from('import_logs')
    .select('*', { count: 'exact' })
    .eq('company_id', company_id)
    .order('import_date', { ascending: false })
    .range(offset, offset + limitNum - 1)

  if (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch import history'
    })
  }

  return res.status(200).json({
    success: true,
    data: imports,
    pagination: {
      current_page: pageNum,
      total_pages: Math.ceil(count / limitNum),
      total_records: count,
      per_page: limitNum
    }
  })
}

// Helper functions
async function getExistingItems(company_id) {
  const { data } = await supabase
    .from('items')
    .select('id, item_code, barcode')
    .eq('company_id', company_id)
  return data || []
}

async function getUnits(company_id) {
  const { data } = await supabase
    .from('units')
    .select('id, unit_name, unit_symbol')
    .or(`company_id.is.null,company_id.eq.${company_id}`)
  return data || []
}

async function getTaxRates(company_id) {
  const { data } = await supabase
    .from('tax_rates')
    .select('id, tax_name, tax_rate')
    .eq('company_id', company_id)
  return data || []
}

async function generateItemCode(company_id, item_type) {
  const prefix = item_type === 'service' ? 'SER' : 'PRD'
  
  const { data: lastItem } = await supabase
    .from('items')
    .select('item_code')
    .eq('company_id', company_id)
    .like('item_code', `${prefix}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let nextNumber = 1
  if (lastItem && lastItem.item_code) {
    const match = lastItem.item_code.match(new RegExp(`${prefix}-(\\d+)`))
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }

  return `${prefix}-${nextNumber.toString().padStart(4, '0')}`
}

export default withAuth(handler)