// pages/api/sales/invoices/bulk.js
import { supabase } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'
import { generateNextDocumentNumber } from '../../settings/document-numbering'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'POST':
        return await bulkCreateInvoices(req, res)
      case 'PUT':
        return await bulkUpdateInvoices(req, res)
      case 'DELETE':
        return await bulkDeleteInvoices(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Bulk invoice API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function bulkCreateInvoices(req, res) {
  const {
    company_id,
    invoices,
    validate_only = false,
    auto_send = false,
    email_template_id
  } = req.body

  if (!company_id || !invoices || !Array.isArray(invoices)) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and invoices array are required'
    })
  }

  if (invoices.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one invoice is required'
    })
  }

  if (invoices.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 100 invoices allowed per bulk operation'
    })
  }

  // Validate all invoices first
  const validationResults = await validateBulkInvoices(company_id, invoices)

  if (validate_only) {
    return res.status(200).json({
      success: true,
      validation_only: true,
      data: validationResults
    })
  }

  if (validationResults.errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      validation: validationResults
    })
  }

  // Process bulk invoice creation
  const results = await processBulkInvoiceCreation(company_id, validationResults.valid_invoices)

  // Send emails if requested
  if (auto_send && results.successful.length > 0) {
    const emailResults = await sendBulkInvoiceEmails(results.successful, email_template_id)
    results.email_results = emailResults
  }

  // Create bulk operation log
  await logBulkOperation(company_id, 'bulk_create', {
    total_requested: invoices.length,
    successful: results.successful.length,
    failed: results.failed.length,
    auto_send,
    email_sent: results.email_results?.sent || 0
  })

  const success = results.failed.length === 0
  const statusCode = success ? 201 : 207 // 207 = Partial success

  return res.status(statusCode).json({
    success,
    message: `Bulk creation completed: ${results.successful.length} created, ${results.failed.length} failed`,
    data: {
      successful: results.successful,
      failed: results.failed,
      email_results: results.email_results,
      validation: validationResults,
      summary: {
        total_processed: invoices.length,
        successful: results.successful.length,
        failed: results.failed.length
      }
    }
  })
}

async function bulkUpdateInvoices(req, res) {
  const {
    company_id,
    invoice_ids,
    updates
  } = req.body

  if (!company_id || !invoice_ids || !Array.isArray(invoice_ids) || !updates) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, invoice IDs array, and updates object are required'
    })
  }

  if (invoice_ids.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one invoice ID is required'
    })
  }

  if (invoice_ids.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 100 invoices allowed per bulk operation'
    })
  }

  // Validate updates
  const allowedFields = ['status', 'payment_status', 'notes', 'terms_conditions']
  const validUpdates = {}
  
  for (const field of allowedFields) {
    if (updates.hasOwnProperty(field)) {
      validUpdates[field] = updates[field]
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No valid update fields provided'
    })
  }

  validUpdates.updated_at = new Date().toISOString()

  // Process bulk update
  const results = {
    successful: [],
    failed: []
  }

  for (const invoiceId of invoice_ids) {
    try {
      const { data: updatedInvoice, error } = await supabase
        .from('sales_documents')
        .update(validUpdates)
        .eq('id', invoiceId)
        .eq('company_id', company_id)
        .eq('document_type', 'invoice')
        .select('id, document_number')
        .single()

      if (error) {
        results.failed.push({
          invoice_id: invoiceId,
          error: error.message
        })
      } else {
        results.successful.push({
          invoice_id: invoiceId,
          document_number: updatedInvoice.document_number
        })
      }
    } catch (error) {
      results.failed.push({
        invoice_id: invoiceId,
        error: error.message
      })
    }
  }

  // Log bulk operation
  await logBulkOperation(company_id, 'bulk_update', {
    total_requested: invoice_ids.length,
    successful: results.successful.length,
    failed: results.failed.length,
    updates: validUpdates
  })

  const success = results.failed.length === 0
  const statusCode = success ? 200 : 207

  return res.status(statusCode).json({
    success,
    message: `Bulk update completed: ${results.successful.length} updated, ${results.failed.length} failed`,
    data: results
  })
}

async function bulkDeleteInvoices(req, res) {
  const {
    company_id,
    invoice_ids,
    reason = 'Bulk deletion',
    reverse_inventory = true
  } = req.body

  if (!company_id || !invoice_ids || !Array.isArray(invoice_ids)) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and invoice IDs array are required'
    })
  }

  if (invoice_ids.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one invoice ID is required'
    })
  }

  if (invoice_ids.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 50 invoices allowed per bulk deletion'
    })
  }

  const results = {
    successful: [],
    failed: []
  }

  for (const invoiceId of invoice_ids) {
    try {
      // Get invoice details
      const { data: invoice, error: fetchError } = await supabase
        .from('sales_documents')
        .select(`
          *,
          items:sales_document_items(*)
        `)
        .eq('id', invoiceId)
        .eq('company_id', company_id)
        .eq('document_type', 'invoice')
        .single()

      if (fetchError) {
        results.failed.push({
          invoice_id: invoiceId,
          error: 'Invoice not found'
        })
        continue
      }

      // Check for payments
      const { data: payments } = await supabase
        .from('payment_allocations')
        .select('id')
        .eq('sales_document_id', invoiceId)
        .limit(1)

      if (payments && payments.length > 0) {
        results.failed.push({
          invoice_id: invoiceId,
          document_number: invoice.document_number,
          error: 'Cannot delete invoice with existing payments'
        })
        continue
      }

      // Reverse inventory if requested
      if (reverse_inventory) {
        for (const item of invoice.items) {
          if (item.item_id) {
            const { data: currentItem } = await supabase
              .from('items')
              .select('current_stock, available_stock, track_inventory')
              .eq('id', item.item_id)
              .single()

            if (currentItem && currentItem.track_inventory) {
              // Create reverse movement
              await supabase
                .from('inventory_movements')
                .insert({
                  company_id,
                  item_id: item.item_id,
                  item_code: item.item_code,
                  movement_type: 'in',
                  quantity: item.quantity,
                  reference_type: 'sales_document_cancellation',
                  reference_id: invoiceId,
                  reference_number: `BULK-DEL-${invoice.document_number}`,
                  stock_before: currentItem.current_stock,
                  stock_after: currentItem.current_stock + item.quantity,
                  movement_date: new Date().toISOString().split('T')[0],
                  notes: `Bulk deletion: ${reason}`,
                  created_at: new Date().toISOString()
                })

              // Update item stock
              await supabase
                .from('items')
                .update({
                  current_stock: currentItem.current_stock + item.quantity,
                  available_stock: (currentItem.available_stock || currentItem.current_stock) + item.quantity,
                  updated_at: new Date().toISOString()
                })
                .eq('id', item.item_id)
            }
          }
        }
      }

      // Cancel invoice
      const { error: deleteError } = await supabase
        .from('sales_documents')
        .update({
          status: 'cancelled',
          notes: (invoice.notes || '') + `\nBulk cancellation: ${reason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (deleteError) {
        results.failed.push({
          invoice_id: invoiceId,
          document_number: invoice.document_number,
          error: deleteError.message
        })
      } else {
        results.successful.push({
          invoice_id: invoiceId,
          document_number: invoice.document_number
        })
      }

    } catch (error) {
      results.failed.push({
        invoice_id: invoiceId,
        error: error.message
      })
    }
  }

  // Log bulk operation
  await logBulkOperation(company_id, 'bulk_delete', {
    total_requested: invoice_ids.length,
    successful: results.successful.length,
    failed: results.failed.length,
    reason,
    reverse_inventory
  })

  const success = results.failed.length === 0
  const statusCode = success ? 200 : 207

  return res.status(statusCode).json({
    success,
    message: `Bulk deletion completed: ${results.successful.length} cancelled, ${results.failed.length} failed`,
    data: results
  })
}

async function validateBulkInvoices(company_id, invoices) {
  const validInvoices = []
  const errors = []

  // Get reference data for validation
  const [customers, items] = await Promise.all([
    getCustomers(company_id),
    getItems(company_id)
  ])

  const customerMap = new Map(customers.map(c => [c.id, c]))
  const itemMap = new Map(items.map(i => [i.id, i]))

  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i]
    const rowNumber = i + 1
    const invoiceErrors = []

    // Validate required fields
    if (!invoice.customer_id) {
      invoiceErrors.push('Customer ID is required')
    } else if (!customerMap.has(invoice.customer_id)) {
      invoiceErrors.push('Customer not found')
    }

    if (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) {
      invoiceErrors.push('Items are required')
    } else {
      // Validate items
      for (let j = 0; j < invoice.items.length; j++) {
        const item = invoice.items[j]
        if (!item.item_id || !itemMap.has(item.item_id)) {
          invoiceErrors.push(`Item ${j + 1}: Invalid item ID`)
        }
        if (!item.quantity || parseFloat(item.quantity) <= 0) {
          invoiceErrors.push(`Item ${j + 1}: Invalid quantity`)
        }
        if (!item.rate || parseFloat(item.rate) <= 0) {
          invoiceErrors.push(`Item ${j + 1}: Invalid rate`)
        }
      }
    }

    if (invoiceErrors.length > 0) {
      errors.push({
        row: rowNumber,
        customer_id: invoice.customer_id,
        errors: invoiceErrors
      })
    } else {
      validInvoices.push({
        row: rowNumber,
        invoice: invoice,
        customer: customerMap.get(invoice.customer_id)
      })
    }
  }

  return {
    valid_invoices: validInvoices,
    errors,
    summary: {
      total: invoices.length,
      valid: validInvoices.length,
      errors: errors.length
    }
  }
}

async function processBulkInvoiceCreation(company_id, validInvoices) {
  const successful = []
  const failed = []

  for (const validInvoice of validInvoices) {
    try {
      const { invoice, customer, row } = validInvoice

      // Generate invoice number
      const { document_number } = await generateNextDocumentNumber(company_id, 'invoice')

      // Calculate totals (simplified version)
      const subtotal = invoice.items.reduce((sum, item) => 
        sum + (parseFloat(item.quantity) * parseFloat(item.rate)), 0)
      
      // Create invoice
      const invoiceData = {
        company_id,
        document_type: 'invoice',
        document_number,
        document_date: invoice.document_date || new Date().toISOString().split('T')[0],
        due_date: invoice.due_date,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_gstin: customer.gstin,
        billing_address: invoice.billing_address || customer.billing_address,
        shipping_address: invoice.shipping_address || customer.shipping_address,
        subtotal,
        tax_amount: subtotal * 0.18, // Simplified tax calculation
        total_amount: subtotal * 1.18,
        balance_amount: subtotal * 1.18,
        status: 'confirmed',
        payment_status: 'unpaid',
        notes: invoice.notes,
        created_at: new Date().toISOString()
      }

      const { data: createdInvoice, error } = await supabase
        .from('sales_documents')
        .insert(invoiceData)
        .select()
        .single()

      if (error) {
        failed.push({
          row,
          customer_id: customer.id,
          error: error.message
        })
        continue
      }

      // Create invoice items (simplified)
      for (const item of invoice.items) {
        await supabase
          .from('sales_document_items')
          .insert({
            document_id: createdInvoice.id,
            item_id: item.item_id,
            quantity: parseFloat(item.quantity),
            rate: parseFloat(item.rate),
            total_amount: parseFloat(item.quantity) * parseFloat(item.rate)
          })
      }

      successful.push({
        row,
        invoice_id: createdInvoice.id,
        document_number,
        customer_name: customer.name,
        total_amount: invoiceData.total_amount
      })

    } catch (error) {
      failed.push({
        row: validInvoice.row,
        customer_id: validInvoice.customer.id,
        error: error.message
      })
    }
  }

  return { successful, failed }
}

async function sendBulkInvoiceEmails(successfulInvoices, templateId) {
  const sent = []
  const failed = []

  for (const invoice of successfulInvoices) {
    try {
      // Send email (placeholder - integrate with actual email service)
      const emailResult = await sendInvoiceEmail(invoice.invoice_id, templateId)
      
      if (emailResult.success) {
        sent.push(invoice.invoice_id)
      } else {
        failed.push({
          invoice_id: invoice.invoice_id,
          error: emailResult.error
        })
      }
    } catch (error) {
      failed.push({
        invoice_id: invoice.invoice_id,
        error: error.message
      })
    }
  }

  return { sent: sent.length, failed: failed.length, details: { sent, failed } }
}

async function sendInvoiceEmail(invoiceId, templateId) {
  // Placeholder for email sending
  return { success: true }
}

async function logBulkOperation(company_id, operation_type, details) {
  try {
    await supabase
      .from('bulk_operation_logs')
      .insert({
        company_id,
        operation_type,
        details,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging bulk operation:', error)
  }
}

async function getCustomers(company_id) {
  const { data } = await supabase
    .from('customers')
    .select('id, name, email, gstin, billing_address, shipping_address')
    .eq('company_id', company_id)
    .eq('status', 'active')
  return data || []
}

async function getItems(company_id) {
  const { data } = await supabase
    .from('items')
    .select('id, item_code, item_name, selling_price')
    .eq('company_id', company_id)
    .eq('is_active', true)
  return data || []
}

export default withAuth(handler)
