// pages/api/purchase/returns/[id].js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Return ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getReturn(req, res, id)
      case 'PUT':
        return await updateReturn(req, res, id)
      case 'DELETE':
        return await deleteReturn(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Return API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getReturn(req, res, returnId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const { data: returnDoc, error } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(id, vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*)
    `)
    .eq('id', returnId)
    .eq('company_id', company_id)
    .eq('document_type', 'purchase_return')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Purchase return not found'
      })
    }

    console.error('Error fetching return:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase return'
    })
  }

  return res.status(200).json({
    success: true,
    data: returnDoc
  })
}

async function updateReturn(req, res, returnId) {
  const { company_id, status, notes } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if return exists
  const { data: existingReturn, error: fetchError } = await supabaseAdmin
    .from('purchase_documents')
    .select('*')
    .eq('id', returnId)
    .eq('company_id', company_id)
    .eq('document_type', 'purchase_return')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Purchase return not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase return'
    })
  }

  let updateData = {
    updated_at: new Date().toISOString()
  }

  if (status) updateData.status = status
  if (notes !== undefined) updateData.notes = notes

  // Update return
  const { data: updatedReturn, error: updateError } = await supabaseAdmin
    .from('purchase_documents')
    .update(updateData)
    .eq('id', returnId)
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*)
    `)
    .single()

  if (updateError) {
    console.error('Error updating return:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update purchase return'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Purchase return updated successfully',
    data: updatedReturn
  })
}

async function deleteReturn(req, res, returnId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if return exists
  const { data: returnDoc, error: fetchError } = await supabaseAdmin
    .from('purchase_documents')
    .select('document_number, status')
    .eq('id', returnId)
    .eq('company_id', company_id)
    .eq('document_type', 'purchase_return')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Purchase return not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase return'
    })
  }

  // Check if return can be deleted
  if (returnDoc.status === 'processed' || returnDoc.status === 'approved') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete processed or approved returns'
    })
  }

  // Delete return (items will be deleted by CASCADE)
  const { error: deleteError } = await supabaseAdmin
    .from('purchase_documents')
    .delete()
    .eq('id', returnId)
    .eq('company_id', company_id)

  if (deleteError) {
    console.error('Error deleting return:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete purchase return'
    })
  }

  return res.status(200).json({
    success: true,
    message: `Purchase return ${returnDoc.document_number} deleted successfully`
  })
}

export default withAuth(handler)