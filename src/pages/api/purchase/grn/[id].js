// pages/api/purchase/grn/[id].js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'GRN ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getGRN(req, res, id)
      case 'PUT':
        return await updateGRN(req, res, id)
      case 'DELETE':
        return await deleteGRN(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('GRN API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getGRN(req, res, grnId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const { data: grn, error } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(id, vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*)
    `)
    .eq('id', grnId)
    .eq('company_id', company_id)
    .eq('document_type', 'grn')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'GRN not found'
      })
    }

    console.error('Error fetching GRN:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch GRN'
    })
  }

  return res.status(200).json({
    success: true,
    data: grn
  })
}

async function updateGRN(req, res, grnId) {
  const { company_id, status, items, notes } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if GRN exists
  const { data: existingGRN, error: fetchError } = await supabaseAdmin
    .from('purchase_documents')
    .select('*')
    .eq('id', grnId)
    .eq('company_id', company_id)
    .eq('document_type', 'grn')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'GRN not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch GRN'
    })
  }

  let updateData = {
    updated_at: new Date().toISOString()
  }

  if (status) updateData.status = status
  if (notes !== undefined) updateData.notes = notes

  // Update GRN
  const { data: updatedGRN, error: updateError } = await supabaseAdmin
    .from('purchase_documents')
    .update(updateData)
    .eq('id', grnId)
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*)
    `)
    .single()

  if (updateError) {
    console.error('Error updating GRN:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update GRN'
    })
  }

  // Update items if provided
  if (items && items.length > 0) {
    // Delete existing items
    await supabaseAdmin
      .from('purchase_document_items')
      .delete()
      .eq('document_id', grnId)

    // Insert new items
    const processedItems = items.map(item => ({
      document_id: grnId,
      item_id: item.item_id,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description || null,
      ordered_quantity: Number(parseFloat(item.ordered_quantity) || 0),
      received_quantity: Number(parseFloat(item.received_quantity) || 0),
      unit_id: item.unit_id || null,
      unit_name: item.unit_name || null,
      hsn_sac_code: item.hsn_sac_code || null
    }))

    await supabaseAdmin
      .from('purchase_document_items')
      .insert(processedItems)
  }

  return res.status(200).json({
    success: true,
    message: 'GRN updated successfully',
    data: updatedGRN
  })
}

async function deleteGRN(req, res, grnId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if GRN exists
  const { data: grn, error: fetchError } = await supabaseAdmin
    .from('purchase_documents')
    .select('document_number, status')
    .eq('id', grnId)
    .eq('company_id', company_id)
    .eq('document_type', 'grn')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'GRN not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch GRN'
    })
  }

  // Check if GRN can be deleted
  if (grn.status === 'verified') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete verified GRNs'
    })
  }

  // Delete GRN (items will be deleted by CASCADE)
  const { error: deleteError } = await supabaseAdmin
    .from('purchase_documents')
    .delete()
    .eq('id', grnId)
    .eq('company_id', company_id)

  if (deleteError) {
    console.error('Error deleting GRN:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete GRN'
    })
  }

  return res.status(200).json({
    success: true,
    message: `GRN ${grn.document_number} deleted successfully`
  })
}

export default withAuth(handler)