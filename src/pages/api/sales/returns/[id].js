// pages/api/sales/returns/[id].js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Credit Note ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getCreditNote(req, res, id)
      case 'PUT':
        return await updateCreditNote(req, res, id)
      case 'DELETE':
        return await deleteCreditNote(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Credit Note API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getCreditNote(req, res, creditNoteId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const { data: creditNote, error } = await supabaseAdmin
    .from('sales_documents')
    .select(`
      *,
      customer:customers(id, name, customer_code, email, phone, gstin, billing_address, shipping_address),
      branch:branches(id, name, document_prefix),
      items:sales_document_items(
        *,
        item:items(item_name, item_code, current_stock, mrp, selling_price),
        unit:units(unit_name, unit_symbol)
      )
    `)
    .eq('id', creditNoteId)
    .eq('company_id', company_id)
    .eq('document_type', 'credit_note')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Credit note not found'
      })
    }

    console.error('Error fetching credit note:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch credit note'
    })
  }

  return res.status(200).json({
    success: true,
    data: creditNote
  })
}

async function updateCreditNote(req, res, creditNoteId) {
  const {
    company_id,
    document_date,
    notes,
    reason,
    status
  } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if credit note exists
  const { data: existingCN, error: fetchError } = await supabaseAdmin
    .from('sales_documents')
    .select('*')
    .eq('id', creditNoteId)
    .eq('company_id', company_id)
    .eq('document_type', 'credit_note')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Credit note not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch credit note'
    })
  }

  // Simple update
  let updateData = {
    updated_at: new Date().toISOString()
  }

  if (status) updateData.status = status
  if (document_date !== undefined) updateData.document_date = document_date
  if (notes !== undefined) updateData.notes = notes
  if (reason !== undefined) updateData.reason = reason

  const { error: updateError } = await supabaseAdmin
    .from('sales_documents')
    .update(updateData)
    .eq('id', creditNoteId)

  if (updateError) {
    console.error('Error updating credit note:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update credit note'
    })
  }

  // Fetch updated credit note
  const { data: updatedCN } = await supabaseAdmin
    .from('sales_documents')
    .select(`
      *,
      customer:customers(name, customer_code, email, phone),
      items:sales_document_items(*)
    `)
    .eq('id', creditNoteId)
    .single()

  return res.status(200).json({
    success: true,
    message: 'Credit note updated successfully',
    data: updatedCN
  })
}

async function deleteCreditNote(req, res, creditNoteId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if credit note exists
  const { data: creditNote, error: fetchError } = await supabaseAdmin
    .from('sales_documents')
    .select('document_number, status, items:sales_document_items(*), invoice_id, total_amount, customer_id')
    .eq('id', creditNoteId)
    .eq('company_id', company_id)
    .eq('document_type', 'credit_note')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Credit note not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch credit note'
    })
  }

  // Reverse inventory (reduce stock that was added)
  for (const item of creditNote.items) {
    try {
      const { data: currentItem } = await supabaseAdmin
        .from('items')
        .select('current_stock, track_inventory')
        .eq('id', item.item_id)
        .single()

      if (currentItem && currentItem.track_inventory) {
        const newStock = Math.max(0, parseFloat(currentItem.current_stock) - item.quantity)

        await supabaseAdmin
          .from('items')
          .update({
            current_stock: newStock,
            available_stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.item_id)
      }
    } catch (error) {
      console.error(`Error reversing stock for item ${item.item_id}:`, error)
    }
  }

  // If linked to invoice, reverse the credit note amount
  if (creditNote.invoice_id) {
    const { data: invoice } = await supabaseAdmin
      .from('sales_documents')
      .select('total_amount, paid_amount')
      .eq('id', creditNote.invoice_id)
      .single()

    if (invoice) {
      const newTotalAmount = parseFloat(invoice.total_amount) + parseFloat(creditNote.total_amount)
      const newBalanceAmount = newTotalAmount - parseFloat(invoice.paid_amount || 0)

      await supabaseAdmin
        .from('sales_documents')
        .update({
          total_amount: newTotalAmount,
          balance_amount: newBalanceAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditNote.invoice_id)
    }
  }

  // Delete credit note (items will be deleted by CASCADE)
  const { error: deleteError } = await supabaseAdmin
    .from('sales_documents')
    .delete()
    .eq('id', creditNoteId)
    .eq('company_id', company_id)

  if (deleteError) {
    console.error('Error deleting credit note:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete credit note'
    })
  }

  return res.status(200).json({
    success: true,
    message: `Credit note ${creditNote.document_number} deleted successfully`
  })
}

export default withAuth(handler)
