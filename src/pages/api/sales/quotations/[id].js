// pages/api/sales/quotations/[id].js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Quotation ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getQuotation(req, res, id)
      case 'PUT':
        return await updateQuotation(req, res, id)
      case 'DELETE':
        return await deleteQuotation(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Quotation API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getQuotation(req, res, quotationId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const { data: quotation, error } = await supabaseAdmin
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
    .eq('id', quotationId)
    .eq('company_id', company_id)
    .eq('document_type', 'quotation')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Quotation not found'
      })
    }

    console.error('Error fetching quotation:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch quotation'
    })
  }

  return res.status(200).json({
    success: true,
    data: quotation
  })
}

async function updateQuotation(req, res, quotationId) {
  const { 
    company_id, 
    customer_id,
    document_date,
    valid_until,
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

  // Check if quotation exists
  const { data: existingQuotation, error: fetchError } = await supabaseAdmin
    .from('sales_documents')
    .select('*, items:sales_document_items(*)')
    .eq('id', quotationId)
    .eq('company_id', company_id)
    .eq('document_type', 'quotation')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Quotation not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch quotation'
    })
  }

  // If items are provided, do a full update with recalculation
  if (items && items.length > 0) {
    console.log('🔄 Full quotation update with items recalculation')

    // Fetch customer details if customer changed
    let customerData = {
      customer_name: existingQuotation.name,
      gstin: existingQuotation.customer_gstin
    }

    if (customer_id && customer_id !== existingQuotation.customer_id) {
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

    // Recalculate totals from items
    let subtotal = 0
    let totalTax = 0
    let cgstAmount = 0
    let sgstAmount = 0
    let igstAmount = 0

    const processedItems = []

    for (const item of items) {
      const quantity = Number(parseFloat(item.quantity) || 0);
      const rateIncludingTax = Number(parseFloat(item.rate) || 0); // Rate as received from frontend (including tax)
      const discountPercentage = Number(parseFloat(item.discount_percentage) || 0);
      const taxRate = Number(parseFloat(item.tax_rate) || 0);

      // CRITICAL FIX: Use the exact taxable_amount sent from frontend
      const taxableAmount = Number(parseFloat(item.taxable_amount) || 0);

      // Calculate line amount with tax
      const lineAmountWithTax = quantity * rateIncludingTax;
      const discountAmount = (lineAmountWithTax * discountPercentage) / 100;
      const lineAmountAfterDiscount = lineAmountWithTax - discountAmount;

      const cgstRate = Number(parseFloat(item.cgst_rate) || 0);
      const sgstRate = Number(parseFloat(item.sgst_rate) || 0);
      const igstRate = Number(parseFloat(item.igst_rate) || 0);

      // CRITICAL FIX: Use the exact tax amounts sent from frontend
      const lineCgst = Number(parseFloat(item.cgst_amount) || 0);
      const lineSgst = Number(parseFloat(item.sgst_amount) || 0);
      const lineIgst = Number(parseFloat(item.igst_amount) || 0);
      const lineTotalTax = lineCgst + lineSgst + lineIgst;

      // CRITICAL FIX: Use the total_amount sent from frontend
      const totalAmount = Number(parseFloat(item.total_amount) || 0);

      subtotal += taxableAmount;
      totalTax += lineTotalTax;
      cgstAmount += lineCgst;
      sgstAmount += lineSgst;
      igstAmount += lineIgst;

      processedItems.push({
        document_id: quotationId,
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

    // Update quotation
    const quotationUpdateData = {
      customer_id: customer_id || existingQuotation.customer_id,
      customer_name: customerData.name,
      customer_gstin: customerData.gstin || null,
      document_date: document_date || existingQuotation.document_date,
      valid_until: valid_until || existingQuotation.valid_until,
      subtotal,
      discount_amount: finalDiscountAmount,
      discount_percentage: docDiscountPercentage,
      tax_amount: totalTax,
      total_amount: totalAmount,
      balance_amount: totalAmount, // Quotations don't have payments
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      notes: notes !== undefined ? notes : existingQuotation.notes,
      terms_conditions: terms_conditions !== undefined ? terms_conditions : existingQuotation.terms_conditions,
      status: status || existingQuotation.status,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('sales_documents')
      .update(quotationUpdateData)
      .eq('id', quotationId)

    if (updateError) {
      console.error('Error updating quotation:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update quotation'
      })
    }

    // Delete old items
    await supabaseAdmin
      .from('sales_document_items')
      .delete()
      .eq('document_id', quotationId)

    // Insert new items
    const { error: itemsError } = await supabaseAdmin
      .from('sales_document_items')
      .insert(processedItems)

    if (itemsError) {
      console.error('Error updating quotation items:', itemsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update quotation items'
      })
    }

    console.log('✅ Quotation updated with full recalculation')
  } else {
    // Simple update without items
    console.log('📝 Simple quotation update without items')

    let updateData = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (document_date !== undefined) updateData.document_date = document_date
    if (valid_until !== undefined) updateData.valid_until = valid_until
    if (notes !== undefined) updateData.notes = notes
    if (terms_conditions !== undefined) updateData.terms_conditions = terms_conditions
    
    // Save discount fields
    if (discount_percentage !== undefined) {
      updateData.discount_percentage = Number(parseFloat(discount_percentage) || 0)
      const beforeDiscount = existingQuotation.subtotal + existingQuotation.tax_amount
      updateData.discount_amount = (beforeDiscount * updateData.discount_percentage) / 100
      updateData.total_amount = beforeDiscount - updateData.discount_amount
    } else if (discount_amount !== undefined) {
      updateData.discount_amount = Number(parseFloat(discount_amount) || 0)
      updateData.discount_percentage = 0
      const beforeDiscount = existingQuotation.subtotal + existingQuotation.tax_amount
      updateData.total_amount = beforeDiscount - updateData.discount_amount
    }

    const { error: updateError } = await supabaseAdmin
      .from('sales_documents')
      .update(updateData)
      .eq('id', quotationId)

    if (updateError) {
      console.error('Error updating quotation:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update quotation'
      })
    }
  }

  // Fetch updated quotation
  const { data: updatedQuotation } = await supabaseAdmin
    .from('sales_documents')
    .select(`
      *,
      customer:customers(name, customer_code, email, phone),
      items:sales_document_items(*)
    `)
    .eq('id', quotationId)
    .single()

  return res.status(200).json({
    success: true,
    message: 'Quotation updated successfully',
    data: updatedQuotation
  })
}

async function deleteQuotation(req, res, quotationId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if quotation exists
  const { data: quotation, error: fetchError } = await supabaseAdmin
    .from('sales_documents')
    .select('document_number, status')
    .eq('id', quotationId)
    .eq('company_id', company_id)
    .eq('document_type', 'quotation')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Quotation not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch quotation'
    })
  }

  // Check if quotation can be deleted
  if (quotation.status === 'converted') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete converted quotations'
    })
  }

  // Delete quotation (items will be deleted by CASCADE)
  const { error: deleteError } = await supabaseAdmin
    .from('sales_documents')
    .delete()
    .eq('id', quotationId)
    .eq('company_id', company_id)

  if (deleteError) {
    console.error('Error deleting quotation:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete quotation'
    })
  }

  return res.status(200).json({
    success: true,
    message: `Quotation ${quotation.document_number} deleted successfully`
  })
}

export default withAuth(handler)
