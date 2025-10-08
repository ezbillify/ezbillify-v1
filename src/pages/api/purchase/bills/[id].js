// pages/api/purchase/bills/[id].js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Bill ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getBill(req, res, id)
      case 'PUT':
        return await updateBill(req, res, id)
      case 'DELETE':
        return await deleteBill(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Bill API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getBill(req, res, billId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const { data: bill, error } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(id, vendor_name, vendor_code, email, phone, gstin, billing_address, shipping_address),
      items:purchase_document_items(
        *,
        item:items(item_name, item_code, current_stock),
        unit:units(unit_name, unit_symbol)
      )
    `)
    .eq('id', billId)
    .eq('company_id', company_id)
    .eq('document_type', 'bill')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Bill not found'
      })
    }

    console.error('Error fetching bill:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bill'
    })
  }

  return res.status(200).json({
    success: true,
    data: bill
  })
}

async function updateBill(req, res, billId) {
  const { company_id, status, payment_status } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if bill exists
  const { data: existingBill, error: fetchError } = await supabaseAdmin
    .from('purchase_documents')
    .select('*')
    .eq('id', billId)
    .eq('company_id', company_id)
    .eq('document_type', 'bill')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Bill not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bill'
    })
  }

  let updateData = {
    updated_at: new Date().toISOString()
  }

  if (status) updateData.status = status
  if (payment_status) updateData.payment_status = payment_status

  // Update bill
  const { data: updatedBill, error: updateError } = await supabaseAdmin
    .from('purchase_documents')
    .update(updateData)
    .eq('id', billId)
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*)
    `)
    .single()

  if (updateError) {
    console.error('Error updating bill:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update bill'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Bill updated successfully',
    data: updatedBill
  })
}

async function deleteBill(req, res, billId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if bill exists
  const { data: bill, error: fetchError } = await supabaseAdmin
    .from('purchase_documents')
    .select('document_number, status, vendor_id, total_amount, items:purchase_document_items(*)')
    .eq('id', billId)
    .eq('company_id', company_id)
    .eq('document_type', 'bill')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Bill not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bill'
    })
  }

  // Check if bill can be deleted
  if (bill.status === 'approved' || bill.paid_amount > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete approved or paid bills'
    })
  }

  // Reverse inventory movements
  for (const item of bill.items) {
    try {
      const { data: currentItem } = await supabaseAdmin
        .from('items')
        .select('current_stock, reserved_stock')
        .eq('id', item.item_id)
        .single()

      if (currentItem) {
        const newStock = parseFloat(currentItem.current_stock) - item.quantity
        const newAvailable = newStock - parseFloat(currentItem.reserved_stock || 0)

        await supabaseAdmin
          .from('items')
          .update({
            current_stock: Math.max(0, newStock),
            available_stock: Math.max(0, newAvailable),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.item_id)
      }
    } catch (error) {
      console.error(`Error reversing inventory for item ${item.item_id}:`, error)
    }
  }

  // Update vendor balance
  try {
    const { data: vendorData } = await supabaseAdmin
      .from('vendors')
      .select('current_balance')
      .eq('id', bill.vendor_id)
      .single()

    if (vendorData) {
      await supabaseAdmin
        .from('vendors')
        .update({
          current_balance: parseFloat(vendorData.current_balance || 0) - bill.total_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', bill.vendor_id)
    }
  } catch (error) {
    console.error('Error updating vendor balance:', error)
  }

  // Delete bill (items will be deleted by CASCADE)
  const { error: deleteError } = await supabaseAdmin
    .from('purchase_documents')
    .delete()
    .eq('id', billId)
    .eq('company_id', company_id)

  if (deleteError) {
    console.error('Error deleting bill:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete bill'
    })
  }

  return res.status(200).json({
    success: true,
    message: `Bill ${bill.document_number} deleted successfully`
  })
}

export default withAuth(handler)