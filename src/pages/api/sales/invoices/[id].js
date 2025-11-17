// src/pages/api/sales/invoices/[id].js - UPDATED WITH COMPANY NAME, MRP, PURCHASE PRICE
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'
import { getGSTType } from '../../../../lib/constants'

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

  // NOTE: we include company with needed fields for printing
  const { data: invoice, error } = await supabaseAdmin
    .from('sales_documents')
    .select(`
      *,
      customer:customers(id, name, company_name, customer_code, customer_type, email, phone, gstin, billing_address, shipping_address),
      branch:branches(id, name, phone, email, address, billing_address, document_prefix, document_number_counter),
      company:companies(
        id,
        name,
        email,
        phone,
        gstin,
        pan,
        cin,
        tan,
        website,
        address,
        billing_address,
        shipping_address,
        logo_url,
        logo_thermal_url,
        settings
      ),
      items:sales_document_items(
        *,
        item:items(item_name, item_code, mrp, selling_price, purchase_price),
        unit:units(unit_name, unit_symbol)
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
  const { 
    company_id, 
    customer_id,
    document_date,
    due_date,
    items,
    notes,
    terms_conditions,
    status,
    payment_status,
    discount_percentage,
    discount_amount
  } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if invoice exists
  const { data: existingInvoice, error: fetchError } = await supabaseAdmin
    .from('sales_documents')
    .select('*, items:sales_document_items(*), customer:customers(id, discount_percentage, credit_limit, credit_used)')
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

  // If items are provided, do a full update with recalculation
  if (items && items.length > 0) {
    console.log('🔄 Full invoice update with items recalculation');
    console.log('Items received from frontend:', JSON.stringify(items, null, 2));

    // Fetch customer details if customer changed
    let customerData = {
      customer_name: existingInvoice.customer_name,
      gstin: existingInvoice.customer_gstin,
      discount_percentage: existingInvoice.customer.discount_percentage
    }

    let newCustomer = null
    if (customer_id && customer_id !== existingInvoice.customer_id) {
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('name, company_name, gstin, discount_percentage, credit_limit, credit_used, billing_address')
        .eq('id', customer_id)
        .eq('company_id', company_id)
        .single()

      if (customerError || !customer) {
        return res.status(400).json({
          success: false,
          error: 'Customer not found'
        })
      }

      customerData = {
        customer_name: customer.name,
        company_name: customer.company_name,
        gstin: customer.gstin,
        discount_percentage: customer.discount_percentage
      }
      newCustomer = customer
    }

    // ✅ Determine GST type based on company and customer states
    let gstType = existingInvoice.gst_type || 'intrastate'; // default to existing or intrastate
    if (newCustomer || existingInvoice.customer) {
      const customerForGST = newCustomer || existingInvoice.customer;
      
      // Get company data for GST calculation
      const { data: companyData } = await supabaseAdmin
        .from('companies')
        .select('address')
        .eq('id', company_id)
        .single();
      
      if (companyData?.address?.state && customerForGST?.billing_address?.state) {
        gstType = getGSTType(companyData.address.state, customerForGST.billing_address.state) || 'intrastate';
      }
    }

    // ✅ Check credit limit for new customer
    if (newCustomer) {
      const creditLimit = parseFloat(newCustomer.credit_limit || 0);
      const creditUsed = parseFloat(newCustomer.credit_used || 0);
      
      if (creditLimit > 0 && creditUsed >= creditLimit) {
        return res.status(400).json({
          success: false,
          error: `Credit limit exceeded. Used: ₹${creditUsed.toFixed(2)} / Limit: ₹${creditLimit.toFixed(2)}`
        })
      }
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

      console.log(`\n--- Processing item ---`);
      console.log(`rate (from frontend): ₹${rateIncludingTax}`);
      console.log(`tax_rate: ${taxRate}%`);
      
      // CRITICAL FIX: Use the exact taxable_amount sent from frontend
      // This is the core fix - we must use the frontend-calculated value
      const taxableAmount = Number(parseFloat(item.taxable_amount) || 0);
      console.log(`taxable_amount (FROM FRONTEND - MUST USE THIS): ₹${taxableAmount}`);

      // Calculate line amount with tax
      const lineAmountWithTax = quantity * rateIncludingTax;
      console.log(`line_amount_with_tax: ₹${lineAmountWithTax}`);

      // Apply discount on the line amount (with tax)
      const discountAmount = (lineAmountWithTax * discountPercentage) / 100;
      const lineAmountAfterDiscount = lineAmountWithTax - discountAmount;
      console.log(`line_amount_after_discount: ₹${lineAmountAfterDiscount}`);

      const cgstRate = Number(parseFloat(item.cgst_rate) || 0);
      const sgstRate = Number(parseFloat(item.sgst_rate) || 0);
      const igstRate = Number(parseFloat(item.igst_rate) || 0);

      // CRITICAL FIX: Use the exact tax amounts sent from frontend
      const lineCgst = Number(parseFloat(item.cgst_amount) || 0);
      const lineSgst = Number(parseFloat(item.sgst_amount) || 0);
      const lineIgst = Number(parseFloat(item.igst_amount) || 0);
      const lineTotalTax = lineCgst + lineSgst + lineIgst;

      console.log(`tax amounts (FROM FRONTEND - MUST USE THESE): CGST: ₹${lineCgst}, SGST: ₹${lineSgst}, IGST: ₹${lineIgst}`);

      // CRITICAL FIX: Use the total_amount sent from frontend
      const totalAmount = Number(parseFloat(item.total_amount) || 0);
      console.log(`total_amount (FROM FRONTEND - MUST USE THIS): ₹${totalAmount}`);

      subtotal += taxableAmount;
      totalTax += lineTotalTax;
      cgstAmount += lineCgst;
      sgstAmount += lineSgst;
      igstAmount += lineIgst;

      processedItems.push({
        document_id: invoiceId,
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || null,
        quantity: quantity,
        unit_id: item.unit_id || null,
        unit_name: item.unit_name || null,
        rate: rateIncludingTax, // Store rate as displayed (including tax)
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        taxable_amount: taxableAmount, // CRITICAL: Store amount excluding tax (FROM FRONTEND)
        tax_rate: Number(parseFloat(item.tax_rate) || 0),
        cgst_rate: cgstRate,
        sgst_rate: sgstRate,
        igst_rate: igstRate,
        cgst_amount: lineCgst, // CRITICAL: FROM FRONTEND
        sgst_amount: lineSgst, // CRITICAL: FROM FRONTEND
        igst_amount: lineIgst, // CRITICAL: FROM FRONTEND
        cess_amount: 0,
        total_amount: totalAmount, // CRITICAL: Store total including tax (FROM FRONTEND)
        hsn_sac_code: item.hsn_sac_code || null,
        mrp: item.mrp || null,
        purchase_price: item.purchase_price || null,
        selling_price: item.selling_price || null
      });
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

    // ✅ Apply customer discount
    let customerDiscountApplied = 0
    let totalAmount = beforeDiscount - finalDiscountAmount
    const customerDiscountPercentage = parseFloat(customerData.discount_percentage || 0)
    
    if (customerDiscountPercentage > 0 && docDiscountPercentage === 0 && docDiscountAmount === 0) {
      customerDiscountApplied = (totalAmount * customerDiscountPercentage) / 100
      totalAmount = totalAmount - customerDiscountApplied
    }

    // ✅ Round total to match frontend calculation
    totalAmount = Math.round(totalAmount)

    const balanceAmount = totalAmount - (existingInvoice.paid_amount || 0)

    console.log(`\n--- Final Calculations ---`);
    console.log(`subtotal: ₹${subtotal}`);
    console.log(`total_tax: ₹${totalTax}`);
    console.log(`cgst_amount: ₹${cgstAmount}`);
    console.log(`sgst_amount: ₹${sgstAmount}`);
    console.log(`igst_amount: ₹${igstAmount}`);
    console.log(`total_amount: ₹${totalAmount}`);

    // ✅ Update customer credit if customer changed
    if (newCustomer) {
      // Reverse old invoice amount from old customer
      const oldCustomer = existingInvoice.customer;
      const oldCustomerCreditUsed = parseFloat(oldCustomer.credit_used || 0);
      const oldInvoiceAmount = parseFloat(existingInvoice.total_amount || 0);
      const reversedCredit = Math.max(0, oldCustomerCreditUsed - oldInvoiceAmount);
      
      await supabaseAdmin
        .from('customers')
        .update({ credit_used: reversedCredit })
        .eq('id', existingInvoice.customer_id)
        .eq('company_id', company_id)

      // Add new invoice amount to new customer
      const newCustomerCreditUsed = parseFloat(newCustomer.credit_used || 0);
      const updatedCredit = newCustomerCreditUsed + parseFloat(totalAmount);
      
      await supabaseAdmin
        .from('customers')
        .update({ credit_used: updatedCredit })
        .eq('id', customer_id)
        .eq('company_id', company_id)
    } else {
      // Same customer, update credit difference
      const oldInvoiceAmount = parseFloat(existingInvoice.total_amount || 0);
      const creditDifference = parseFloat(totalAmount) - oldInvoiceAmount;
      const oldCustomer = existingInvoice.customer;
      const oldCreditUsed = parseFloat(oldCustomer.credit_used || 0);
      const newCreditUsed = oldCreditUsed + creditDifference;
      
      await supabaseAdmin
        .from('customers')
        .update({ credit_used: newCreditUsed })
        .eq('id', existingInvoice.customer_id)
        .eq('company_id', company_id)
    }

    // Update invoice
    const invoiceUpdateData = {
      customer_id: customer_id || existingInvoice.customer_id,
      customer_name: customerData.customer_name,
      customer_gstin: customerData.gstin || null,
      document_date: document_date || existingInvoice.document_date,
      due_date: due_date || existingInvoice.due_date,
      subtotal,
      discount_amount: finalDiscountAmount,
      discount_percentage: docDiscountPercentage,
      tax_amount: totalTax,
      total_amount: parseFloat(totalAmount),
      balance_amount: parseFloat(balanceAmount),
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      gst_type: gstType, // ✅ Add GST type to update data
      customer_discount_percentage: customerDiscountPercentage,
      customer_discount_amount: customerDiscountApplied,
      notes: notes !== undefined ? notes : existingInvoice.notes,
      terms_conditions: terms_conditions !== undefined ? terms_conditions : existingInvoice.terms_conditions,
      status: status || existingInvoice.status,
      payment_status: payment_status || existingInvoice.payment_status,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('sales_documents')
      .update(invoiceUpdateData)
      .eq('id', invoiceId)

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update invoice'
      })
    }

    // Delete old items
    await supabaseAdmin
      .from('sales_document_items')
      .delete()
      .eq('document_id', invoiceId)

    // Insert new items
    console.log('Inserting processed items:', JSON.stringify(processedItems, null, 2));
    const { error: itemsError } = await supabaseAdmin
      .from('sales_document_items')
      .insert(processedItems)

    if (itemsError) {
      console.error('Error updating invoice items:', itemsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update invoice items'
      })
    }

    console.log('✅ Invoice updated with full recalculation')
  } else {
    // Simple update without items
    console.log('📝 Simple invoice update without items')

    let updateData = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (payment_status) updateData.payment_status = payment_status
    if (document_date !== undefined) updateData.document_date = document_date
    if (due_date !== undefined) updateData.due_date = due_date
    if (notes !== undefined) updateData.notes = notes
    if (terms_conditions !== undefined) updateData.terms_conditions = terms_conditions
    
    // Save discount fields
    if (discount_percentage !== undefined) {
      updateData.discount_percentage = Number(parseFloat(discount_percentage) || 0)
      const beforeDiscount = existingInvoice.subtotal + existingInvoice.tax_amount
      updateData.discount_amount = (beforeDiscount * updateData.discount_percentage) / 100
      updateData.total_amount = Math.round(beforeDiscount - updateData.discount_amount)
      updateData.balance_amount = updateData.total_amount - (existingInvoice.paid_amount || 0)
    } else if (discount_amount !== undefined) {
      updateData.discount_amount = Number(parseFloat(discount_amount) || 0)
      updateData.discount_percentage = 0
      const beforeDiscount = existingInvoice.subtotal + existingInvoice.tax_amount
      updateData.total_amount = Math.round(beforeDiscount - updateData.discount_amount)
      updateData.balance_amount = updateData.total_amount - (existingInvoice.paid_amount || 0)
    }

    const { error: updateError } = await supabaseAdmin
      .from('sales_documents')
      .update(updateData)
      .eq('id', invoiceId)

    if (updateError) {
      console.error('Error updating invoice:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update invoice'
      })
    }
  }

  // Fetch updated invoice with company_name
  const { data: updatedInvoice } = await supabaseAdmin
    .from('sales_documents')
    .select(`
      *,
      customer:customers(id, name, company_name, customer_code, customer_type, email, phone),
      items:sales_document_items(*)
    `)
    .eq('id', invoiceId)
    .single()

  return res.status(200).json({
    success: true,
    message: 'Invoice updated successfully',
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
  const { data: invoice, error: fetchError } = await supabaseAdmin
    .from('sales_documents')
    .select(`
      *,
      items:sales_document_items(*),
      customer:customers(id, credit_used)
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
  const { data: payments } = await supabaseAdmin
    .from('payment_allocations')
    .select('id')
    .eq('document_id', invoiceId)
    .limit(1)

  if (payments && payments.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete invoice with existing payments'
    })
  }

  // ✅ Reverse customer credit used
  const invoiceAmount = parseFloat(invoice.total_amount || 0);
  const customerCreditUsed = parseFloat(invoice.customer?.credit_used || 0);
  const reversedCredit = Math.max(0, customerCreditUsed - invoiceAmount);
  
  await supabaseAdmin
    .from('customers')
    .update({ credit_used: reversedCredit })
    .eq('id', invoice.customer_id)
    .eq('company_id', company_id)

  // Reverse inventory movements
  for (const item of invoice.items) {
    if (item.item_id) {
      // Get current item stock
      const { data: currentItem } = await supabaseAdmin
        .from('items')
        .select('current_stock, available_stock, track_inventory')
        .eq('id', item.item_id)
        .single()

      if (currentItem && currentItem.track_inventory) {
        // Create reverse inventory movement (stock in)
        await supabaseAdmin
          .from('inventory_movements')
          .insert({
            company_id,
            branch_id: invoice.branch_id,
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
        await supabaseAdmin
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
  const { error: deleteError } = await supabaseAdmin
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