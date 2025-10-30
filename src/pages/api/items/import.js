// pages/api/items/import.js
import { supabase, supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'
import { parse } from 'csv-parse/sync'
import XLSX from 'xlsx'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'POST':
        // Handle file upload for import
        if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
          return await importItemsFromFile(req, res)
        }
        // Handle JSON import (existing functionality)
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

// New function to handle file-based import
async function importItemsFromFile(req, res) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Parse form data with formidable
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
    })

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Formidable parse error:', err)
          reject(err)
        }
        resolve([fields, files])
      })
    })

    // Access the file correctly
    const file = files.file
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }

    // Handle both single file and array of files
    const actualFile = Array.isArray(file) ? file[0] : file

    // Read file data - handle different structures from formidable
    let fileData
    const filepath = actualFile.filepath || actualFile.path
    
    if (filepath) {
      try {
        fileData = fs.readFileSync(filepath)
      } catch (readError) {
        console.error('Error reading file from disk:', readError)
        return res.status(400).json({
          success: false,
          error: 'Failed to read file from disk: ' + readError.message
        })
      }
    } else if (actualFile.buffer) {
      fileData = actualFile.buffer
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unable to read file data - no accessible file path or buffer'
      })
    }

    // Get file properties safely
    const fileName = actualFile.originalFilename || actualFile.name || ''
    const mimeType = actualFile.mimetype || actualFile.type || ''

    // Parse the file based on type
    let itemsData = []
    
    if (mimeType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
      try {
        // Parse CSV
        const records = parse(fileData, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        })
        itemsData = records
      } catch (parseError) {
        console.error('CSV parsing error:', parseError)
        return res.status(400).json({
          success: false,
          error: 'Failed to parse CSV file: ' + parseError.message
        })
      }
    } else if (mimeType.includes('excel') || 
               mimeType.includes('spreadsheet') ||
               fileName.toLowerCase().endsWith('.xlsx') || 
               fileName.toLowerCase().endsWith('.xls')) {
      try {
        // Parse Excel
        const workbook = XLSX.read(fileData, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        itemsData = XLSX.utils.sheet_to_json(worksheet)
      } catch (parseError) {
        console.error('Excel parsing error:', parseError)
        return res.status(400).json({
          success: false,
          error: 'Failed to parse Excel file: ' + parseError.message
        })
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file type. Please upload CSV or Excel files.'
      })
    }

    // Convert string values to appropriate types
    const processedItems = itemsData.map(item => {
      return {
        ...item,
        selling_price: item.selling_price ? parseFloat(item.selling_price) : 0,
        selling_price_with_tax: item.selling_price_with_tax ? parseFloat(item.selling_price_with_tax) : 0,
        purchase_price: item.purchase_price ? parseFloat(item.purchase_price) : 0,
        mrp: item.mrp ? parseFloat(item.mrp) : null,
        conversion_factor: item.conversion_factor ? parseFloat(item.conversion_factor) : 1,
        track_inventory: item.track_inventory === 'true' || item.track_inventory === true,
        current_stock: item.current_stock ? parseFloat(item.current_stock) : 0,
        reserved_stock: item.reserved_stock ? parseFloat(item.reserved_stock) : 0,
        reorder_level: item.reorder_level ? parseFloat(item.reorder_level) : 0,
        max_stock_level: item.max_stock_level ? parseFloat(item.max_stock_level) : null,
        is_active: item.is_active === 'true' || item.is_active === true,
        is_for_sale: item.is_for_sale === 'true' || item.is_for_sale === true,
        is_for_purchase: item.is_for_purchase === 'true' || item.is_for_purchase === true
      }
    })

    // Get reference data for validation
    const [units, taxRates] = await Promise.all([
      getUnits(company_id),
      getTaxRates(company_id)
    ])

    // Validate all items with reference data
    const validationResults = await validateItemsWithReferences(company_id, processedItems, false, units, taxRates)
    
    if (validationResults.errors.length > 0 && !validationResults.warnings_only) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validation: validationResults
      })
    }

    // Process import
    const importResults = await processItemImport(company_id, validationResults.valid_items, false)

    // Create import log
    const importLog = {
      company_id,
      import_source: 'file_upload',
      total_items: itemsData.length,
      successful_imports: importResults.successful.length,
      failed_imports: importResults.failed.length,
      updated_items: importResults.updated.length,
      validation_errors: validationResults.errors.length,
      validation_warnings: validationResults.warnings.length,
      import_date: new Date().toISOString(),
      status: importResults.failed.length === 0 ? 'completed' : 'completed_with_errors'
    }

    await supabaseAdmin
      .from('import_logs')
      .insert(importLog)

    const success = importResults.failed.length === 0
    const statusCode = success ? 200 : 207 // 207 = Partial success

    return res.status(statusCode).json({
      success,
      message: `Import completed: ${importResults.successful.length} created, ${importResults.updated.length} updated, ${importResults.failed.length} failed`,
      data: {
        successful: importResults.successful.length,
        updated: importResults.updated.length,
        failed: importResults.failed.length,
        errors: importResults.failed.map(f => f.error)
      }
    })

  } catch (error) {
    console.error('Item import file error:', error)
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

  await supabaseAdmin
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

    // Item code validation - for file imports, we ignore any provided item codes
    // and generate new ones to ensure proper sequence continuation
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

    // HSN/SAC validation
    if (item.hsn_sac_code && (item.hsn_sac_code.length < 4 || item.hsn_sac_code.length > 8)) {
      itemWarnings.push('HSN/SAC code should be 4-8 characters')
    }

    // Unit name validation
    if (item.primary_unit_name) {
      const unitExists = units.some(u => u.unit_name === item.primary_unit_name);
      if (!unitExists) {
        itemErrors.push(`Unit "${item.primary_unit_name}" not found. Check the Units reference sheet.`);
      }
    }

    // Tax rate name validation
    if (item.tax_rate_name) {
      const taxRateExists = taxRates.some(t => t.tax_name === item.tax_rate_name);
      if (!taxRateExists) {
        itemErrors.push(`Tax rate "${item.tax_rate_name}" not found. Check the Tax Rates reference sheet.`);
      }
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
      const processedItem = await processItemForImport(company_id, item, units, taxRates)
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

async function validateItemsWithReferences(company_id, items, update_existing, units, taxRates) {
  const validItems = []
  const errors = []
  const warnings = []
  const duplicates = []

  // Get existing items for validation
  const existingItems = await getExistingItems(company_id)

  const existingItemCodes = new Set(existingItems.map(item => item.item_code))
  const existingBarcodes = new Set(existingItems.filter(item => item.barcode).map(item => item.barcode))

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

    // Item code validation - for file imports, we ignore any provided item codes
    // and generate new ones to ensure proper sequence continuation
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

    // HSN/SAC validation
    if (item.hsn_sac_code && (item.hsn_sac_code.length < 4 || item.hsn_sac_code.length > 8)) {
      itemWarnings.push('HSN/SAC code should be 4-8 characters')
    }

    // Unit name validation
    if (item.primary_unit_name) {
      const unitExists = units.some(u => u.unit_name === item.primary_unit_name);
      if (!unitExists) {
        itemErrors.push(`Unit "${item.primary_unit_name}" not found. Check the Units reference sheet.`);
      }
    }

    // Tax rate name validation
    if (item.tax_rate_name) {
      const taxRateExists = taxRates.some(t => t.tax_name === item.tax_rate_name);
      if (!taxRateExists) {
        itemErrors.push(`Tax rate "${item.tax_rate_name}" not found. Check the Tax Rates reference sheet.`);
      }
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
      const processedItem = await processItemForImport(company_id, item, units, taxRates)
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

async function processItemForImport(company_id, item, units, taxRates) {
  // Handle unit name to ID mapping
  let primaryUnitId = item.primary_unit_id;
  if (item.primary_unit_name) {
    const unit = units.find(u => u.unit_name === item.primary_unit_name);
    if (unit) {
      primaryUnitId = unit.id;
    }
  }
  
  // If still no unit, get default unit
  if (!primaryUnitId) {
    const defaultUnit = units.find(u => u.unit_symbol === 'PCS' && (u.company_id === company_id || u.company_id === null));
    primaryUnitId = defaultUnit?.id;
  }

  // Handle tax rate name to ID mapping
  let taxRateId = item.tax_rate_id;
  if (item.tax_rate_name) {
    const taxRate = taxRates.find(t => t.tax_name === item.tax_rate_name);
    if (taxRate) {
      taxRateId = taxRate.id;
    }
  }

  // Generate item code automatically (don't require it from import)
  // This ensures proper sequence continuation
  const itemType = item.item_type || 'product';
  const itemCode = await generateNextItemCode(company_id, itemType);

  return {
    company_id,
    item_code: itemCode, // Always use auto-generated code for consistency
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
    tax_rate_id: taxRateId || null,
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
  }
}

// Standardized function to generate next item code
async function generateNextItemCode(company_id, item_type) {
  try {
    // Use consistent prefixes across the system
    const prefix = item_type === 'service' ? 'SER' : 'PRD'
    
    // Use admin client to bypass RLS
    const { data: items, error } = await supabaseAdmin
      .from('items')
      .select('item_code')
      .eq('company_id', company_id)
      .like('item_code', `${prefix}-%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database query error:', error)
      throw error
    }

    let nextNumber = 1
    
    if (items && items.length > 0) {
      // Find the highest number in the sequence
      const numbers = items
        .map(item => {
          const match = item.item_code.match(new RegExp(`${prefix}-(\\d+)`))
          return match ? parseInt(match[1]) : 0
        })
        .filter(num => !isNaN(num) && num > 0)
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1
      }
    }

    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`
  } catch (error) {
    console.error('Error in generateNextItemCode:', error)
    // Fallback to timestamp-based code
    const timestamp = Date.now().toString().slice(-4)
    const prefix = item_type === 'service' ? 'SER' : 'PRD'
    return `${prefix}-${timestamp}`
  }
}

// Update the existing generateItemCode function to use the new standardized version
async function generateItemCode(company_id, item_type) {
  return await generateNextItemCode(company_id, item_type)
}

async function processItemImport(company_id, valid_items, update_existing) {
  const successful = []
  const updated = []
  const failed = []

  for (const validItem of valid_items) {
    try {
      const itemData = validItem.processed
      const isUpdate = validItem.is_update && update_existing

      if (isUpdate) {
        // Update existing item
        const { data, error } = await supabaseAdmin
          .from('items')
          .update(itemData)
          .eq('company_id', company_id)
          .eq('item_code', validItem.original.item_code)
          .select()
          .single()

        if (error) {
          throw error
        }

        updated.push(data)
      } else {
        // Create new item
        const { data, error } = await supabaseAdmin
          .from('items')
          .insert(itemData)
          .select()
          .single()

        if (error) {
          throw error
        }

        successful.push(data)
      }
    } catch (error) {
      console.error('Error processing item:', error)
      failed.push({
        item: validItem.original.item_name || validItem.original.item_code,
        error: error.message
      })
    }
  }

  return { successful, updated, failed }
}

async function getImportHistory(req, res) {
  const { company_id, page = 1, limit = 10 } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  const { data: imports, error, count } = await supabaseAdmin
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
  const { data } = await supabaseAdmin
    .from('items')
    .select('id, item_code, barcode')
    .eq('company_id', company_id)
  return data || []
}

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