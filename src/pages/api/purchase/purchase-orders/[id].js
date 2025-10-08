// pages/api/purchase/purchase-orders/[id].js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Purchase order ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getPurchaseOrder(req, res, id)
      case 'PUT':
        return await updatePurchaseOrder(req, res, id)
      case 'DELETE':
        return await deletePurchaseOrder(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Purchase Order API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getPurchaseOrder(req, res, poId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const { data: purchaseOrder, error } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(id, vendor_name, vendor_code, email, phone, gstin, billing_address, shipping_address),
      items:purchase_document_items(
        *,
        item:items(item_name, item_code),
        unit:units(unit_name, unit_symbol)
      )
    `)
    .eq('id', poId)
    .eq('company_id', company_id)
    .eq('document_type', 'purchase_order')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      })
    }

    console.error('Error fetching purchase order:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase order'
    })
  }

  return res.status(200).json({
    success: true,
    data: purchaseOrder
  })
}

async function updatePurchaseOrder(req, res, poId) {
  const {
    company_id,
    vendor_id,
    document_date,
    due_date,
    billing_address,
    shipping_address,
    items,
    notes,
    terms_conditions,
    status
  } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if purchase order exists
  const { data: existingPO, error: fetchError } = await supabaseAdmin
    .from('purchase_documents')
    .select('*')
    .eq('id', poId)
    .eq('company_id', company_id)
    .eq('document_type', 'purchase_order')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase order'
    })
  }

  // Prepare update data
  let updateData = {
    updated_at: new Date().toISOString()
  }

  // Update vendor if changed
  if (vendor_id && vendor_id !== existingPO.vendor_id) {
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('vendor_name, gstin')
      .eq('id', vendor_id)
      .eq('company_id', company_id)
      .single()

    if (vendorError || !vendor) {
      return res.status(400).json({
        success: false,
        error: 'Vendor not found'
      })
    }

    updateData.vendor_id = vendor_id
    updateData.vendor_name = vendor.vendor_name
    updateData.vendor_gstin = vendor.gstin || null
  }

  // Update other fields
  if (document_date) updateData.document_date = document_date
  if (due_date !== undefined) updateData.due_date = due_date || null
  if (billing_address !== undefined) updateData.billing_address = billing_address
  if (shipping_address !== undefined) updateData.shipping_address = shipping_address
  if (notes !== undefined) updateData.notes = notes || null
  if (terms_conditions !== undefined) updateData.terms_conditions = terms_conditions || null
  if (status) updateData.status = status

  // Update items if provided
  if (items && items.length > 0) {
    let subtotal = 0
    let totalTax = 0
    let cgstAmount = 0
    let sgstAmount = 0
    let igstAmount = 0

    const processedItems = []

    for (const item of items) {
      const quantity = Number(parseFloat(item.quantity) || 0)
      const rate = Number(parseFloat(item.rate) || 0)
      const discountPercentage = Number(parseFloat(item.discount_percentage) || 0)

      const lineAmount = quantity * rate
      const discountAmount = (lineAmount * discountPercentage) / 100
      const taxableAmount = lineAmount - discountAmount

      const cgstRate = Number(parseFloat(item.cgst_rate) || 0)
      const sgstRate = Number(parseFloat(item.sgst_rate) || 0)
      const igstRate = Number(parseFloat(item.igst_rate) || 0)

      const lineCgst = (taxableAmount * cgstRate) / 100
      const lineSgst = (taxableAmount * sgstRate) / 100
      const lineIgst = (taxableAmount * igstRate) / 100
      const lineTotalTax = lineCgst + lineSgst + lineIgst

      const totalAmount = taxableAmount + lineTotalTax

      subtotal += taxableAmount
      totalTax += lineTotalTax
      cgstAmount += lineCgst
      sgstAmount += lineSgst
      igstAmount += lineIgst

      processedItems.push({
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || null,
        quantity: quantity,
        unit_id: item.unit_id || null,
        unit_name: item.unit_name || null,
        rate: rate,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        taxable_amount: taxableAmount,
        tax_rate: Number(parseFloat(item.tax_rate) || 0),
        cgst_rate: cgstRate,
        sgst_rate: sgstRate,
        igst_rate: igstRate,
        cgst_amount: lineCgst,
        sgst_amount: lineSgst,
        igst_amount: lineIgst,
        cess_amount: 0,
        total_amount: totalAmount,
        hsn_sac_code: item.hsn_sac_code || null
      })
    }

    const totalAmount = subtotal + totalTax

    updateData.subtotal = subtotal
    updateData.tax_amount = totalTax
    updateData.total_amount = totalAmount
    updateData.cgst_amount = cgstAmount
    updateData.sgst_amount = sgstAmount
    updateData.igst_amount = igstAmount

    // Delete existing items
    const { error: deleteItemsError } = await supabaseAdmin
      .from('purchase_document_items')
      .delete()
      .eq('document_id', poId)

    if (deleteItemsError) {
      console.error('Error deleting old items:', deleteItemsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete old items'
      })
    }

    // Insert new items
    const itemsToInsert = processedItems.map(item => ({
      ...item,
      document_id: poId
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('purchase_document_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error inserting new items:', itemsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update purchase order items'
      })
    }
  }

  // Update purchase order
  const { data: updatedPO, error: updateError } = await supabaseAdmin
    .from('purchase_documents')
    .update(updateData)
    .eq('id', poId)
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*)
    `)
    .single()

  if (updateError) {
    console.error('Error updating purchase order:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update purchase order'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Purchase order updated successfully',
    data: updatedPO
  })
}

async function deletePurchaseOrder(req, res, poId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const { data: po, error: fetchError } = await supabaseAdmin
    .from('purchase_documents')
    .select('document_number, status')
    .eq('id', poId)
    .eq('company_id', company_id)
    .eq('document_type', 'purchase_order')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Purchase order not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase order'
    })
  }

  if (po.status === 'approved' || po.status === 'closed') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete approved or closed purchase orders'
    })
  }

  const { error: deleteError } = await supabaseAdmin
    .from('purchase_documents')
    .delete()
    .eq('id', poId)
    .eq('company_id', company_id)

  if (deleteError) {
    console.error('Error deleting purchase order:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete purchase order'
    })
  }

  return res.status(200).json({
    success: true,
    message: `Purchase order ${po.document_number} deleted successfully`
  })
}

export default withAuth(handler)