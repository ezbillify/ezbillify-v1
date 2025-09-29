// pages/api/sales/invoices/[id].js
import { supabase } from '../../../../lib/supabase'
import { withAuth } from '../../../../lib/middleware/auth'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Invoice ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getInvoice(req, res, id)
      case 'PUT':
        return await updateInvoice(req, res, id)
      case 'DELETE':
        return await deleteInvoice(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Individual invoice API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getInvoice(req, res, invoiceId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Get invoice with all related data
  const { data: invoice, error } = await supabase
    .from('sales_documents')
    .select(`
      *,
      customer:customers(id, name, email, phone, customer_type, billing_address, shipping_address),
      items:sales_document_items(*),
      payments:payment_allocations(
        payment:payments(id, payment_number, amount, payment_date, payment_method)
      )
    `)
    .eq('id', invoiceId)
    .eq('company_id', company_id)
    .eq('document_type', 'invoice')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      })
    }
    
    console.error('Error fetching invoice:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice'
    })
  }

  return res.status(200).json({
    success: true,
    data: invoice
  })
}

async function updateInvoice(req, res, invoiceId) {
  const { company_id, status, payment_status, notes, terms_conditions } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if invoice exists
  const { data: existingInvoice, error: fetchError } = await supabase
    .from('sales_documents')
    .select('*')
    .eq('id', invoiceId)
    .eq('company_id', company_id)
    .eq('document_type', 'invoice')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice'
    })
  }

  // Prepare update data
  const updateData = {
    updated_at: new Date().toISOString()
  }

  // Allow specific field updates
  if (status && ['draft', 'sent', 'confirmed', 'cancelled'].includes(status)) {
    updateData.status = status
  }

  if (payment_status && ['paid', 'unpaid', 'partial', 'overdue'].includes(payment_status)) {
    updateData.payment_status = payment_status
  }

  if (notes !== undefined) {
    updateData.notes = notes?.trim() || null
  }

  if (terms_conditions !== undefined) {
    updateData.terms_conditions = terms_conditions?.trim() || null
  }

  const { data: updatedInvoice, error: updateError } = await supabase
    .from('sales_documents')
    .update(updateData)
    .eq('id', invoiceId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating invoice:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update invoice'
    })
  }

  return res.status(200).json({
    success: true,
    message: `Invoice ${existingInvoice.document_number} updated successfully`,
    data: updatedInvoice
  })
}

async function deleteInvoice(req, res, invoiceId) {
  const { company_id, reason } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if invoice exists and get its details
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
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice'
    })
  }

  // Check if invoice has payments
  const { data: payments } = await supabase
    .from('payment_allocations')
    .select('id')
    .eq('sales_document_id', invoiceId)
    .limit(1)

  if (payments && payments.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete invoice with existing payments'
    })
  }

  // Reverse inventory movements
  for (const item of invoice.items) {
    if (item.item_id) {
      // Get current item stock
      const { data: currentItem } = await supabase
        .from('items')
        .select('current_stock, available_stock, track_inventory')
        .eq('id', item.item_id)
        .single()

      if (currentItem && currentItem.track_inventory) {
        // Create reverse inventory movement (stock in)
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
            reference_number: `REV-${invoice.document_number}`,
            stock_before: currentItem.current_stock,
            stock_after: currentItem.current_stock + item.quantity,
            movement_date: new Date().toISOString().split('T')[0],
            notes: `Reversed due to invoice deletion: ${reason || 'No reason provided'}`,
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

  // Delete invoice (cascade will delete items)
  const { error: deleteError } = await supabase
    .from('sales_documents')
    .update({
      status: 'cancelled',
      notes: (invoice.notes || '') + `\nCancelled: ${reason || 'Deleted via API'}`,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId)

  if (deleteError) {
    console.error('Error deleting invoice:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete invoice'
    })
  }

  return res.status(200).json({
    success: true,
    message: `Invoice ${invoice.document_number} cancelled and inventory reversed`
  })
}

export default withAuth(handler)