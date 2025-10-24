async function createInvoice(req, res) {
  const {
    company_id,
    branch_id,
    customer_id,
    sales_order_id,
    document_date,
    due_date,
    items,
    notes,
    terms_conditions,
    discount_percentage,
    discount_amount
  } = req.body

  console.log('📥 Creating invoice with data:', {
    company_id,
    branch_id,
    customer_id,
    sales_order_id,
    document_date,
    items: items?.length,
    hasNotes: !!notes,
    hasTerms: !!terms_conditions
  });

  // Validate required fields with better error messages
  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  if (!branch_id) {
    return res.status(400).json({
      success: false,
      error: 'Branch ID is required'
    })
  }

  if (!customer_id) {
    return res.status(400).json({
      success: false,
      error: 'Customer ID is required'
    })
  }

  if (!document_date) {
    return res.status(400).json({
      success: false,
      error: 'Document date is required'
    })
  }

  if (!items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one item is required'
    })
  }

  try {
    // Fetch branch details
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('document_prefix, name')
      .eq('id', branch_id)
      .eq('company_id', company_id)
      .single()

    if (branchError || !branch) {
      console.error('❌ Branch not found:', branchError);
      return res.status(400).json({
        success: false,
        error: 'Branch not found'
      })
    }

    const branchPrefix = branch.document_prefix || 'BR'
    console.log('🏢 Branch prefix:', branchPrefix);

    // Fetch customer details
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('name, customer_code, gstin, billing_address, shipping_address, state_name')
      .eq('id', customer_id)
      .eq('company_id', company_id)
      .single()

    if (customerError || !customer) {
      console.error('❌ Customer not found:', customerError);
      return res.status(400).json({
        success: false,
        error: 'Customer not found'
      })
    }

    // Get financial year
    const docDate = new Date(document_date)
    const currentMonth = docDate.getMonth()
    const currentYear = docDate.getFullYear()
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1
    const fyEndYear = fyStartYear + 1
    const currentFY = `${fyStartYear}-${fyEndYear.toString().padStart(4, '0')}`
    console.log('📅 Financial year:', currentFY);

    // Fetch document sequence with branch filter
    const { data: sequence, error: sequenceError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('branch_id', branch_id)
      .eq('document_type', 'invoice')
      .eq('is_active', true)
      .maybeSingle()

    let currentNumberForInvoice
    let documentNumber

    if (!sequence) {
      console.log('⚠️ No sequence found, creating new one');
      // Create new sequence for this branch
      const { data: newSequence, error: createSeqError } = await supabaseAdmin
        .from('document_sequences')
        .insert({
          company_id,
          branch_id,
          document_type: 'invoice',
          prefix: 'INV-',
          current_number: 1,
          padding_zeros: 4,
          financial_year: currentFY,
          reset_frequency: 'yearly',
          is_active: true
        })
        .select()
        .single()

      if (createSeqError) {
        console.error('❌ Error creating sequence:', createSeqError)
        return res.status(500).json({
          success: false,
          error: 'Failed to create document sequence'
        })
      }

      currentNumberForInvoice = 1
      const paddedNumber = currentNumberForInvoice.toString().padStart(4, '0')
      documentNumber = `${branchPrefix}-INV-${paddedNumber}/${currentFY.substring(2)}`
      console.log('✅ Created new sequence, document number:', documentNumber);
    } else {
      console.log('✅ Found existing sequence:', sequence);
      // Check if FY has changed, reset sequence if needed
      if (sequence.financial_year !== currentFY && sequence.reset_frequency === 'yearly') {
        console.log('📅 Resetting sequence for new FY');
        const { error: resetError } = await supabaseAdmin
          .from('document_sequences')
          .update({
            current_number: 1,
            financial_year: currentFY,
            updated_at: new Date().toISOString()
          })
          .eq('id', sequence.id)

        if (resetError) {
          console.error('❌ Error resetting sequence:', resetError)
          return res.status(500).json({
            success: false,
            error: 'Failed to reset sequence for new financial year'
          })
        }

        currentNumberForInvoice = 1
      } else {
        currentNumberForInvoice = sequence.current_number
      }

      const paddedNumber = currentNumberForInvoice.toString().padStart(sequence.padding_zeros || 4, '0')
      documentNumber = `${branchPrefix}-${sequence.prefix || ''}${paddedNumber}/${currentFY.substring(2)}`
      
      // Increment sequence number for next use
      const nextNumber = currentNumberForInvoice + 1
      const { error: updateSeqError } = await supabaseAdmin
        .from('document_sequences')
        .update({ 
          current_number: nextNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequence.id)

      if (updateSeqError) {
        console.error('Warning: Failed to update sequence number:', updateSeqError)
      }
      
      console.log('✅ Generated document number:', documentNumber);
    }

    // Fetch company GSTIN to determine interstate/intrastate
    const { data: companyData } = await supabaseAdmin
      .from('companies')
      .select('gstin')
      .eq('id', company_id)
      .single()

    const companyStateCode = companyData?.gstin?.substring(0, 2)
    const customerStateCode = customer.gstin?.substring(0, 2)
    const isInterstate = companyStateCode !== customerStateCode
    console.log('📍 GST calculation - Company:', companyStateCode, 'Customer:', customerStateCode, 'Interstate:', isInterstate);

    // Calculate totals from items
    let subtotal = 0
    let totalTax = 0
    let cgstAmount = 0
    let sgstAmount = 0
    let igstAmount = 0

    const processedItems = []

    for (const item of items) {
      console.log('📦 Processing item:', item);
      // Fetch item details
      const { data: itemData, error: itemError } = await supabaseAdmin
        .from('items')
        .select('item_name, item_code, hsn_sac_code, gst_rate, current_stock, reserved_stock, track_inventory')
        .eq('id', item.item_id)
        .eq('company_id', company_id)
        .single()

      if (itemError || !itemData) {
        console.error('❌ Item not found:', item.item_id, itemError);
        return res.status(400).json({
          success: false,
          error: `Item not found: ${item.item_id}`
        })
      }

      const quantity = Number(parseFloat(item.quantity) || 0)
      const rate = Number(parseFloat(item.rate) || 0)
      const discountPercentage = Number(parseFloat(item.discount_percentage) || 0)

      const lineAmount = quantity * rate
      const discountAmount = (lineAmount * discountPercentage) / 100
      const taxableAmount = lineAmount - discountAmount

      const taxRate = Number(parseFloat(item.tax_rate || itemData.gst_rate) || 0)
      let cgstRate = 0
      let sgstRate = 0
      let igstRate = 0

      if (isInterstate) {
        igstRate = taxRate
      } else {
        cgstRate = taxRate / 2
        sgstRate = taxRate / 2
      }

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
        item_code: itemData.item_code,
        item_name: itemData.item_name,
        description: item.description || null,
        quantity: quantity,
        unit_id: item.unit_id || null,
        unit_name: item.unit_name || null,
        rate: rate,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        taxable_amount: taxableAmount,
        tax_rate: taxRate,
        cgst_rate: cgstRate,
        sgst_rate: sgstRate,
        igst_rate: igstRate,
        cgst_amount: lineCgst,
        sgst_amount: lineSgst,
        igst_amount: lineIgst,
        cess_amount: 0,
        total_amount: totalAmount,
        hsn_sac_code: itemData.hsn_sac_code || item.hsn_sac_code || null,
        track_inventory: itemData.track_inventory,
        stock_before: itemData.current_stock
      })
      
      console.log(`📦 Item processed: ${itemData.item_name}, Qty: ${quantity}, Rate: ₹${rate}, Total: ₹${totalAmount}`);
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
    console.log('💰 Totals - Subtotal:', subtotal, 'Tax:', totalTax, 'Discount:', finalDiscountAmount, 'Total:', totalAmount);

    // Create invoice document
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('sales_documents')
      .insert({
        company_id,
        branch_id,
        document_type: 'invoice',
        document_number: documentNumber,
        document_date,
        due_date: due_date || null,
        customer_id,
        customer_name: customer.name,
        customer_code: customer.customer_code,
        customer_gstin: customer.gstin || null,
        billing_address: customer.billing_address,
        shipping_address: customer.shipping_address || customer.billing_address,
        sales_order_id: sales_order_id || null,
        subtotal,
        discount_amount: finalDiscountAmount,
        discount_percentage: docDiscountPercentage,
        tax_amount: totalTax,
        total_amount: totalAmount,
        balance_amount: totalAmount,
        paid_amount: 0,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        notes: notes || null,
        terms_conditions: terms_conditions || null,
        status: 'draft',
        payment_status: 'unpaid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('❌ Error creating invoice:', invoiceError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create invoice',
        details: process.env.NODE_ENV === 'development' ? invoiceError.message : undefined
      })
    }

    console.log('✅ Invoice created:', invoice.id);

    // Insert invoice items
    const itemsToInsert = processedItems.map(item => ({
      document_id: invoice.id,
      item_id: item.item_id,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity,
      unit_id: item.unit_id,
      unit_name: item.unit_name,
      rate: item.rate,
      discount_percentage: item.discount_percentage,
      discount_amount: item.discount_amount,
      taxable_amount: item.taxable_amount,
      tax_rate: item.tax_rate,
      cgst_rate: item.cgst_rate,
      sgst_rate: item.sgst_rate,
      igst_rate: item.igst_rate,
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      cess_amount: item.cess_amount,
      total_amount: item.total_amount,
      hsn_sac_code: item.hsn_sac_code
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('sales_document_items')
      .insert(itemsToInsert)

    if (itemsError) {
      // Rollback: delete the invoice
      await supabaseAdmin
        .from('sales_documents')
        .delete()
        .eq('id', invoice.id)

      console.error('❌ Error creating invoice items:', itemsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create invoice items',
        details: process.env.NODE_ENV === 'development' ? itemsError.message : undefined
      })
    }

    console.log('✅ Invoice items created:', itemsToInsert.length);

    // Update inventory and create movements
    for (const item of processedItems) {
      if (item.track_inventory) {
        // Unreserve stock if from sales order
        if (sales_order_id) {
          const newReserved = Math.max(0, parseFloat(item.stock_before || 0) - item.quantity)
          await supabaseAdmin
            .from('items')
            .update({
              reserved_stock: newReserved,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.item_id)
        }

        // Reduce current stock
        const newStock = Math.max(0, parseFloat(item.stock_before) - item.quantity)
        await supabaseAdmin
          .from('items')
          .update({
            current_stock: newStock,
            available_stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.item_id)

        // Create inventory movement
        await supabaseAdmin
          .from('inventory_movements')
          .insert({
            company_id,
            branch_id,
            item_id: item.item_id,
            item_code: item.item_code,
            movement_type: 'out',
            quantity: item.quantity,
            rate: item.rate,
            value: item.quantity * item.rate,
            reference_type: 'sales_document',
            reference_id: invoice.id,
            reference_number: documentNumber,
            stock_before: item.stock_before,
            stock_after: newStock,
            movement_date: document_date,
            notes: `Sales invoice: ${documentNumber}`,
            created_at: new Date().toISOString()
          })
      }
    }

    // Update sales order status if linked
    if (sales_order_id) {
      await supabaseAdmin
        .from('sales_documents')
        .update({ status: 'invoiced' })
        .eq('id', sales_order_id)
        .eq('company_id', company_id)
    }

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: {
        ...invoice,
        items: itemsToInsert
      }
    })

  } catch (error) {
    console.error('❌ Error creating invoice:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create invoice',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// pages/api/sales/invoices/index.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getInvoices(req, res)
      case 'POST':
        return await createInvoice(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Sales invoices API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getInvoices(req, res) {
  const { 
    company_id,
    branch_id,
    customer_id,
    status,
    payment_status,
    from_date,
    to_date,
    search,
    page = 1,
    limit = 50,
    sort_by = 'document_date',
    sort_order = 'desc'
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  let query = supabaseAdmin
    .from('sales_documents')
    .select(`
      *,
      customer:customers(id, name, customer_code, email, phone),
      branch:branches(id, name, document_prefix),
      items:sales_document_items(*)
    `, { count: 'exact' })
    .eq('company_id', company_id)
    .eq('document_type', 'invoice')

  // Apply filters
  if (branch_id) {
    query = query.eq('branch_id', branch_id)
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (payment_status) {
    query = query.eq('payment_status', payment_status)
  }

  if (from_date) {
    query = query.gte('document_date', from_date)
  }

  if (to_date) {
    query = query.lte('document_date', to_date)
  }

  if (search) {
    query = query.or(`document_number.ilike.%${search}%,name.ilike.%${search}%`)
  }

  // Apply sorting
  query = query.order(sort_by, { ascending: sort_order === 'asc' })

  // Apply pagination
  const offset = (parseInt(page) - 1) * parseInt(limit)
  query = query.range(offset, offset + parseInt(limit) - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching invoices:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices'
    })
  }

  return res.status(200).json({
    success: true,
    data: data || [],
    pagination: {
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil((count || 0) / parseInt(limit))
    }
  })
}

export default withAuth(handler)
