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
  const { 
    company_id, 
    vendor_id,
    vendor_invoice_number,
    document_date,
    due_date,
    items,
    notes,
    terms_conditions,
    status, 
    payment_status,
    discount_percentage,  // ✅ ADDED
    discount_amount       // ✅ ADDED
  } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if bill exists
  const { data: existingBill, error: fetchError } = await supabaseAdmin
    .from('purchase_documents')
    .select('*, items:purchase_document_items(*)')
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

  // ✅ If items are provided, we need to do a full update with recalculation
  if (items && items.length > 0) {
    console.log('🔄 Full bill update with items recalculation')

    // Fetch vendor details if vendor changed
    let vendorData = {
      vendor_name: existingBill.vendor_name,
      gstin: existingBill.vendor_gstin
    }

    if (vendor_id && vendor_id !== existingBill.vendor_id) {
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

      vendorData = vendor
    }

    // Recalculate totals from items
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
        document_id: billId,
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

    // ✅ Calculate bill-level discount
    const beforeDiscount = subtotal + totalTax
    const billDiscountPercentage = Number(parseFloat(discount_percentage) || 0)
    const billDiscountAmount = Number(parseFloat(discount_amount) || 0)
    
    let finalDiscountAmount = 0
    if (billDiscountPercentage > 0) {
      finalDiscountAmount = (beforeDiscount * billDiscountPercentage) / 100
    } else if (billDiscountAmount > 0) {
      finalDiscountAmount = billDiscountAmount
    }

    const totalAmount = beforeDiscount - finalDiscountAmount
    const balanceAmount = totalAmount - (existingBill.paid_amount || 0)

    // Update bill
    const billUpdateData = {
      vendor_id: vendor_id || existingBill.vendor_id,
      vendor_name: vendorData.vendor_name,
      vendor_gstin: vendorData.gstin || null,
      vendor_invoice_number: vendor_invoice_number || existingBill.vendor_invoice_number,
      document_date: document_date || existingBill.document_date,
      due_date: due_date || existingBill.due_date,
      subtotal,
      discount_amount: finalDiscountAmount,  // ✅ SAVE CALCULATED DISCOUNT
      discount_percentage: billDiscountPercentage,  // ✅ SAVE DISCOUNT PERCENTAGE
      tax_amount: totalTax,
      total_amount: totalAmount,
      balance_amount: balanceAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      notes: notes !== undefined ? notes : existingBill.notes,
      terms_conditions: terms_conditions !== undefined ? terms_conditions : existingBill.terms_conditions,
      status: status || existingBill.status,
      payment_status: payment_status || existingBill.payment_status,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('purchase_documents')
      .update(billUpdateData)
      .eq('id', billId)

    if (updateError) {
      console.error('Error updating bill:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update bill'
      })
    }

    // Delete old items
    await supabaseAdmin
      .from('purchase_document_items')
      .delete()
      .eq('document_id', billId)

    // Insert new items
    const { error: itemsError } = await supabaseAdmin
      .from('purchase_document_items')
      .insert(processedItems)

    if (itemsError) {
      console.error('Error updating bill items:', itemsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update bill items'
      })
    }

    console.log('✅ Bill updated with full recalculation')
  } else {
    // ✅ Simple update without items (status, payment_status, discount only)
    console.log('📝 Simple bill update without items')

    let updateData = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (payment_status) updateData.payment_status = payment_status
    if (vendor_invoice_number !== undefined) updateData.vendor_invoice_number = vendor_invoice_number
    if (document_date !== undefined) updateData.document_date = document_date
    if (due_date !== undefined) updateData.due_date = due_date
    if (notes !== undefined) updateData.notes = notes
    if (terms_conditions !== undefined) updateData.terms_conditions = terms_conditions
    
    // ✅ SAVE DISCOUNT FIELDS
    if (discount_percentage !== undefined) {
      updateData.discount_percentage = Number(parseFloat(discount_percentage) || 0)
      // Recalculate discount amount based on percentage
      const beforeDiscount = existingBill.subtotal + existingBill.tax_amount
      updateData.discount_amount = (beforeDiscount * updateData.discount_percentage) / 100
      updateData.total_amount = beforeDiscount - updateData.discount_amount
      updateData.balance_amount = updateData.total_amount - (existingBill.paid_amount || 0)
    } else if (discount_amount !== undefined) {
      updateData.discount_amount = Number(parseFloat(discount_amount) || 0)
      updateData.discount_percentage = 0
      const beforeDiscount = existingBill.subtotal + existingBill.tax_amount
      updateData.total_amount = beforeDiscount - updateData.discount_amount
      updateData.balance_amount = updateData.total_amount - (existingBill.paid_amount || 0)
    }

    const { error: updateError } = await supabaseAdmin
      .from('purchase_documents')
      .update(updateData)
      .eq('id', billId)

    if (updateError) {
      console.error('Error updating bill:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update bill'
      })
    }
  }

  // Fetch updated bill
  const { data: updatedBill } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*)
    `)
    .eq('id', billId)
    .single()

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