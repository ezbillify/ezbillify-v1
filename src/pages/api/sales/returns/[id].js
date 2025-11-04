async function updateCreditNote(req, res, creditNoteId) {
  const {
    company_id,
    document_date,
    notes,
    reason,
    status,
    items // Add items parameter
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

  // If items are provided, do a full update with recalculation
  if (items && items.length > 0) {
    console.log('🔄 Full credit note update with items recalculation');

    // Recalculate totals from items
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
        document_id: creditNoteId,
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
        hsn_sac_code: item.hsn_sac_code || null
      })
    }

    // Update credit note with new calculations
    const updateData = {
      document_date: document_date !== undefined ? document_date : existingCN.document_date,
      notes: notes !== undefined ? notes : existingCN.notes,
      reason: reason !== undefined ? reason : existingCN.reason,
      status: status || existingCN.status,
      subtotal,
      tax_amount: totalTax,
      total_amount: subtotal + totalTax,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      updated_at: new Date().toISOString()
    }

    // Delete old items
    await supabaseAdmin
      .from('sales_document_items')
      .delete()
      .eq('document_id', creditNoteId)

    // Insert new items
    const { error: itemsError } = await supabaseAdmin
      .from('sales_document_items')
      .insert(processedItems)

    if (itemsError) {
      console.error('Error updating credit note items:', itemsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update credit note items'
      })
    }

    // Update credit note
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
  } else {
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
}