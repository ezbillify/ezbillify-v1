// pages/api/customers/import.js
import { withAuth } from '../../../lib/middleware'
import { supabaseAdmin } from '../../../services/utils/supabase'
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
  if (req.method !== 'POST') {
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
    let customersData = []
    
    if (mimeType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
      try {
        // Parse CSV
        const records = parse(fileData, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        })
        customersData = records
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
        customersData = XLSX.utils.sheet_to_json(worksheet)
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

    // Validate and process customers
    const results = await processCustomers(customersData, company_id)
    
    return res.status(200).json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error('Customer import error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to import customers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function processCustomers(customersData, companyId) {
  let imported = 0
  let updated = 0
  let failed = 0
  const errors = []

  for (const customer of customersData) {
    try {
      // Validate required fields
      if (!customer.name || !customer.customer_type) {
        errors.push(`Missing required fields for customer: ${customer.name || 'Unknown'}`)
        failed++
        continue
      }

      // Prepare customer data with safe JSON parsing
      const customerData = {
        company_id: companyId,
        customer_type: customer.customer_type.toLowerCase(),
        name: customer.name,
        email: customer.email || null,
        phone: customer.phone || null,
        mobile: customer.mobile || null,
        customer_code: customer.customer_code || null,
        company_name: customer.company_name || null,
        designation: customer.designation || null,
        gstin: customer.gstin || null,
        pan: customer.pan || null,
        business_type: customer.business_type || null,
        tax_preference: customer.tax_preference || 'taxable',
        credit_limit: parseFloat(customer.credit_limit) || 0,
        payment_terms: parseInt(customer.payment_terms) || 0,
        opening_balance: parseFloat(customer.opening_balance) || 0,
        opening_balance_type: customer.opening_balance_type || 'debit',
        notes: customer.notes || null,
        billing_address: parseAddressField(customer.billing_address),
        shipping_address: parseAddressField(customer.shipping_address),
        same_as_billing: customer.same_as_billing === 'true' || customer.same_as_billing === true,
        status: customer.status || 'active'
      }

      // Check if customer already exists (by email or phone)
      let existingCustomer = null
      if (customer.email) {
        const { data } = await supabaseAdmin
          .from('customers')
          .select('id')
          .eq('company_id', companyId)
          .eq('email', customer.email)
          .maybeSingle()
        existingCustomer = data
      } else if (customer.phone) {
        const { data } = await supabaseAdmin
          .from('customers')
          .select('id')
          .eq('company_id', companyId)
          .eq('phone', customer.phone)
          .maybeSingle()
        existingCustomer = data
      }

      if (existingCustomer) {
        // Update existing customer
        const { error: updateError } = await supabaseAdmin
          .from('customers')
          .update(customerData)
          .eq('id', existingCustomer.id)
        
        if (updateError) {
          errors.push(`Failed to update customer ${customer.name}: ${updateError.message}`)
          failed++
        } else {
          updated++
        }
      } else {
        // Create new customer
        const { error: insertError } = await supabaseAdmin
          .from('customers')
          .insert(customerData)
        
        if (insertError) {
          errors.push(`Failed to create customer ${customer.name}: ${insertError.message}`)
          failed++
        } else {
          imported++
        }
      }
    } catch (error) {
      errors.push(`Error processing customer ${customer.name || 'Unknown'}: ${error.message}`)
      failed++
    }
  }

  return {
    imported,
    updated,
    failed,
    total: customersData.length,
    errors
  }
}

// Helper function to safely parse address fields
function parseAddressField(addressString) {
  if (!addressString || addressString === 'null' || addressString === 'undefined') {
    return null
  }
  
  try {
    // If it's already an object (from Excel), return as is
    if (typeof addressString === 'object') {
      return addressString
    }
    
    // Try to parse as JSON
    return JSON.parse(addressString)
  } catch (e) {
    // If parsing fails, return null
    console.warn('Failed to parse address field:', addressString)
    return null
  }
}

export default withAuth(handler)