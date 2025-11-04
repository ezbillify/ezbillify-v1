// pages/api/sales/sales-orders/[id].js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Sales Order ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getSalesOrder(req, res, id)
      case 'PUT':
        return await updateSalesOrder(req, res, id)
      case 'DELETE':
        return await deleteSalesOrder(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Sales Order API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getSalesOrder(req, res, salesOrderId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const { data: salesOrder, error } = await supabaseAdmin
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
    .eq('id', salesOrderId)
    .eq('company_id', company_id)
    .eq('document_type', 'sales_order')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Sales order not found'
      })
    }

    console.error('Error fetching sales order:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales order'
    })
  }

  return res.status(200).json({
    success: true,
    data: salesOrder
  })
}

async function updateSalesOrder(req, res, salesOrderId) {
  const { 
    company_id, 
    customer_id,
    document_date,
    due_date,
    items,
    notes,
    terms_conditions,
    status,
    discount_percentage,
    discount_amount
  } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if sales order exists
  const { data: existingSO, error: fetchError } = await supabaseAdmin
    .from('sales_documents')
    .select('*, items:sales_document_items(*)')
    .eq('id', salesOrderId)
    .eq('company_id', company_id)
    .eq('document_type', 'sales_order')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Sales order not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales order'
    })
  }

  // If items are provided, do a full update with recalculation
  if (items && items.length > 0) {
    console.log('🔄 Full sales order update with items recalculation')

    // Fetch customer details if customer changed
    let customerData = {
      customer_name: existingSO.name,
      gstin: existingSO.customer_gstin
    }

    if (customer_id && customer_id !== existingSO.customer_id) {
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('name, gstin')
        .eq('id', customer_id)
        .eq('company_id', company_id)
        .single()

      if (customerError || !customer) {
        return res.status(400).json({
          success: false,
          error: 'Customer not found'
        })
      }

      customerData = customer
    }

    // Unreserve old items first
    for (const oldItem of existingSO.items) {
      const { data: currentItem } = await supabaseAdmin
        .from('items')
        .select('current_stock, reserved_stock')
        .eq('id', oldItem.item_id)
        .single()

      if (currentItem) {
        const newReserved = Math.max(0, parseFloat(currentItem.reserved_stock || 0) - oldItem.quantity)
        const newAvailable = parseFloat(currentItem.current_stock) - newReserved

        await supabaseAdmin
          .from('items')
          .update({
            reserved_stock: newReserved,
            available_stock: newAvailable,
            updated_at: new Date().toISOString()
          })
          .eq('id', oldItem.item_id)
      }
    }

    // Recalculate totals from new items
    let subtotal = 0
    let totalTax = 0
    let cgstAmount = 0
    let sgstAmount = 0
    let igstAmount = 0

    const processedItems = []

    for (const item of items) {
      const quantity = Number(parseFloat(item.quantity) || 0)
      const rateIncludingTax = Number(parseFloat(item.rate) || 0)
      const discountPercentage = Number(parseFloat(item.discount_percentage) || 0)
      const taxRate = Number(parseFloat(item.tax_rate) || 0)

      // CRITICAL FIX: Use the exact taxable_amount sent from frontend
      const taxableAmount = Number(parseFloat(item.taxable_amount) || 0)

      // Calculate line amount with tax
      const lineAmountWithTax = quantity * rateIncludingTax
      const discountAmount = (lineAmountWithTax * discountPercentage) / 100
      const lineAmountAfterDiscount = lineAmountWithTax - discountAmount

      const cgstRate = Number(parseFloat(item.cgst_rate) || 0)
      const sgstRate = Number(parseFloat(item.sgst_rate) || 0)
      const igstRate = Number(parseFloat(item.igst_rate) || 0)

      // CRITICAL FIX: Use the exact tax amounts sent from frontend
      const lineCgst = Number(parseFloat(item.cgst_amount) || 0)
      const lineSgst = Number(parseFloat(item.sgst_amount) || 0)
      const lineIgst = Number(parseFloat(item.igst_amount) || 0)
      const lineTotalTax = lineCgst + lineSgst + lineIgst

      // CRITICAL FIX: Use the total_amount sent from frontend
      const totalAmount = Number(parseFloat(item.total_amount) || 0)

      subtotal += taxableAmount
      totalTax += lineTotalTax
      cgstAmount += lineCgst
      sgstAmount += lineSgst
      igstAmount += lineIgst

      processedItems.push({
        document_id: salesOrderId,
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || null,
        quantity: quantity,
        unit_id: item.unit_id || null,
        unit_name: item.unit_name || null,
        rate: rateIncludingTax,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        taxable_amount: taxableAmount, // CRITICAL: FROM FRONTEND
        tax_rate: Number(parseFloat(item.tax_rate) || 0),
        cgst_rate: cgstRate,
        sgst_rate: sgstRate,
        igst_rate: igstRate,
        cgst_amount: lineCgst, // CRITICAL: FROM FRONTEND
        sgst_amount: lineSgst, // CRITICAL: FROM FRONTEND
        igst_amount: lineIgst, // CRITICAL: FROM FRONTEND
        cess_amount: 0,
        total_amount: totalAmount, // CRITICAL: FROM FRONTEND
        hsn_sac_code: item.hsn_sac_code || null,
        mrp: item.mrp || null,
        selling_price: item.selling_price || null
      })
    }

    // Calculate document-level discount
    const beforeDiscount = subtotal + totalTax
    const docDiscountPercentage = Number(parseFloat(discount_percentage) || 0)
    const docDiscountAmount = Number(parseFloat(discount_amount) || 0)
    
    let finalDiscountAmount = 0
    if (docDiscountPercentage > 0) {
      finalDiscountAmount = (beforeDiscount * docDiscountPercentage) / 100
    } else if (docDiscountAmount > 0) {
      finalDiscountAmount = docDiscountAmount
    }

    const totalAmount = beforeDiscount - finalDiscountAmount

    // Update sales order
    const soUpdateData = {
      customer_id: customer_id || existingSO.customer_id,
      customer_name: customerData.name,
      customer_gstin: customerData.gstin || null,
      document_date: document_date || existingSO.document_date,
      due_date: due_date || existingSO.due_date,
      subtotal,
      discount_amount: finalDiscountAmount,
      discount_percentage: docDiscountPercentage,
      tax_amount: totalTax,
      total_amount: totalAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      notes: notes !== undefined ? notes : existingSO.notes,
      terms_conditions: terms_conditions !== undefined ? terms_conditions : existingSO.terms_conditions,
      status: status || existingSO.status,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('sales_documents')
      .update(soUpdateData)
      .eq('id', salesOrderId)

    if (updateError) {
      console.error('Error updating sales order:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update sales order'
      })
    }

    // Delete old items
    await supabaseAdmin
      .from('sales_document_items')
      .delete()
      .eq('document_id', salesOrderId)

    // Insert new items
    const { error: itemsError } = await supabaseAdmin
      .from('sales_document_items')
      .insert(processedItems)

    if (itemsError) {
      console.error('Error updating sales order items:', itemsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update sales order items'
      })
    }

    // Reserve new items stock
    for (const item of processedItems) {
      const { data: currentItem } = await supabaseAdmin
        .from('items')
        .select('current_stock, reserved_stock')
        .eq('id', item.item_id)
        .single()

      if (currentItem) {
        const newReserved = parseFloat(currentItem.reserved_stock || 0) + item.quantity
        const newAvailable = parseFloat(currentItem.current_stock) - newReserved

        await supabaseAdmin
          .from('items')
          .update({
            reserved_stock: newReserved,
            available_stock: newAvailable,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.item_id)
      }
    }

    console.log('✅ Sales order updated with full recalculation')
  } else {
    // Simple update without items
    console.log('📝 Simple sales order update without items')

    let updateData = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (document_date !== undefined) updateData.document_date = document_date
    if (due_date !== undefined) updateData.due_date = due_date
    if (notes !== undefined) updateData.notes = notes
    if (terms_conditions !== undefined) updateData.terms_conditions = terms_conditions
    
    // Save discount fields
    if (discount_percentage !== undefined) {
      updateData.discount_percentage = Number(parseFloat(discount_percentage) || 0)
      const beforeDiscount = existingSO.subtotal + existingSO.tax_amount
      updateData.discount_amount = (beforeDiscount * updateData.discount_percentage) / 100
      updateData.total_amount = beforeDiscount - updateData.discount_amount
    } else if (discount_amount !== undefined) {
      updateData.discount_amount = Number(parseFloat(discount_amount) || 0)
      updateData.discount_percentage = 0
      const beforeDiscount = existingSO.subtotal + existingSO.tax_amount
      updateData.total_amount = beforeDiscount - updateData.discount_amount
    }

    const { error: updateError } = await supabaseAdmin
      .from('sales_documents')
      .update(updateData)
      .eq('id', salesOrderId)

    if (updateError) {
      console.error('Error updating sales order:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update sales order'
      })
    }
  }

  // Fetch updated sales order
  const { data: updatedSO } = await supabaseAdmin
    .from('sales_documents')
    .select(`
      *,
      customer:customers(name, customer_code, email, phone),
      items:sales_document_items(*)
    `)
    .eq('id', salesOrderId)
    .single()

  return res.status(200).json({
    success: true,
    message: 'Sales order updated successfully',
    data: updatedSO
  })
}

async function deleteSalesOrder(req, res, salesOrderId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if sales order exists
  const { data: salesOrder, error: fetchError } = await supabaseAdmin
    .from('sales_documents')
    .select('document_number, status, items:sales_document_items(*)')
    .eq('id', salesOrderId)
    .eq('company_id', company_id)
    .eq('document_type', 'sales_order')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Sales order not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales order'
    })
  }

  // Check if sales order can be deleted
  if (salesOrder.status === 'converted' || salesOrder.status === 'invoiced') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete converted or invoiced sales orders'
    })
  }

  // Unreserve stock for items
  for (const item of salesOrder.items) {
    try {
      const { data: currentItem } = await supabaseAdmin
        .from('items')
        .select('current_stock, reserved_stock')
        .eq('id', item.item_id)
        .single()

      if (currentItem) {
        const newReserved = Math.max(0, parseFloat(currentItem.reserved_stock || 0) - item.quantity)
        const newAvailable = parseFloat(currentItem.current_stock) - newReserved

        await supabaseAdmin
          .from('items')
          .update({
            reserved_stock: newReserved,
            available_stock: newAvailable,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.item_id)
      }
    } catch (error) {
      console.error(`Error unreserving stock for item ${item.item_id}:`, error)
    }
  }

  // Delete sales order (items will be deleted by CASCADE)
  const { error: deleteError } = await supabaseAdmin
    .from('sales_documents')
    .delete()
    .eq('id', salesOrderId)
    .eq('company_id', company_id)

  if (deleteError) {
    console.error('Error deleting sales order:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete sales order'
    })
  }

  return res.status(200).json({
    success: true,
    message: `Sales order ${salesOrder.document_number} deleted successfully`
  })
}

export default withAuth(handler)
