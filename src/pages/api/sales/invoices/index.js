// src/pages/api/sales/invoices/index.js - FIXED (USE AFTER RUNNING MIGRATIONS)
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'
import { getGSTType } from '../../../../lib/constants'

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

  try {
    // ✅ OPTIMIZED: Fetch with company_name for B2B display
    let query = supabaseAdmin
      .from('sales_documents')
      .select(
        'id, company_id, branch_id, document_type, document_number, document_date, due_date, customer_id, customer_name, customer_gstin, subtotal, discount_amount, tax_amount, total_amount, balance_amount, paid_amount, payment_status, status, created_at, updated_at, customer:customers(id, name, company_name, customer_code, customer_type, email, phone)',
        { count: 'exact' }
      )
      .eq('company_id', company_id)
      .eq('document_type', 'invoice')

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
      const statuses = payment_status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        query = query.eq('payment_status', statuses[0]);
      } else {
        query = query.in('payment_status', statuses);
      }
    }

    if (from_date) {
      query = query.gte('document_date', from_date)
    }

    if (to_date) {
      query = query.lte('document_date', to_date)
    }

    if (search) {
      query = query.or(`document_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
    }

    query = query.order(sort_by, { ascending: sort_order === 'asc' })

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const offset = (pageNum - 1) * limitNum

    query = query.range(offset, offset + limitNum - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch invoices'
      })
    }

    console.log(`✅ Fetched ${data?.length || 0} invoices for company ${company_id}`)

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        current_page: pageNum,
        total_pages: Math.ceil((count || 0) / limitNum),
        total_records: count || 0,
        per_page: limitNum,
        has_next_page: pageNum < Math.ceil((count || 0) / limitNum),
        has_prev_page: pageNum > 1
      }
    })
  } catch (error) {
    console.error('Query error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function createInvoice(req, res) {
  const {
    company_id,
    branch_id,
    customer_id,
    parent_document_id,
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
    parent_document_id,
    document_date,
    items: items?.length,
    hasNotes: !!notes,
    hasTerms: !!terms_conditions
  });

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
    // ✅ PARALLEL FETCHES: Get branch, customer, company in parallel
    const [branchResult, customerResult, companyResult] = await Promise.all([
      supabaseAdmin
        .from('branches')
        .select('document_prefix, name, company:companies(address)')
        .eq('id', branch_id)
        .eq('company_id', company_id)
        .single(),
      
      supabaseAdmin
        .from('customers')
        .select('name, company_name, customer_code, gstin, billing_address, shipping_address, discount_percentage, credit_limit, credit_used')
        .eq('id', customer_id)
        .eq('company_id', company_id)
        .single(),

      supabaseAdmin
        .from('companies')
        .select('gstin, address')
        .eq('id', company_id)
        .single()
    ])

    const { data: branch, error: branchError } = branchResult
    const { data: customer, error: customerError } = customerResult
    const { data: companyData } = companyResult

    if (branchError || !branch) {
      console.error('❌ Branch not found:', branchError);
      return res.status(400).json({
        success: false,
        error: 'Branch not found'
      })
    }

    if (customerError || !customer) {
      console.error('❌ Customer not found:', customerError);
      return res.status(400).json({
        success: false,
        error: 'Customer not found'
      })
    }

    // ✅ Determine GST type based on company and customer states
    let gstType = 'intrastate'; // default
    if (companyData?.address?.state && customer?.billing_address?.state) {
      gstType = getGSTType(companyData.address.state, customer.billing_address.state) || 'intrastate';
    }

    // ✅ Check credit limit before creating invoice
    const creditLimit = parseFloat(customer.credit_limit || 0);
    const creditUsed = parseFloat(customer.credit_used || 0);
    
    if (creditLimit > 0 && creditUsed >= creditLimit) {
      return res.status(400).json({
        success: false,
        error: `Credit limit exceeded. Used: ₹${creditUsed.toFixed(2)} / Limit: ₹${creditLimit.toFixed(2)}`
      })
    }

    const branchPrefix = branch.document_prefix || 'BR'

    // Get financial year
    const docDate = new Date(document_date)
    const currentMonth = docDate.getMonth()
    const currentYear = docDate.getFullYear()
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1
    const fyEndYear = fyStartYear + 1
    const currentFY = `${fyStartYear.toString().slice(-2)}-${fyEndYear.toString().slice(-2)}`

    // ✅ Get document sequence
    const { data: sequence, error: sequenceError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('branch_id', branch_id)
      .eq('document_type', 'invoice')
      .eq('is_active', true)
      .maybeSingle()

    let documentNumber
    let currentNumberForInvoice

    if (!sequence) {
      const { data: newSequence, error: createSeqError } = await supabaseAdmin
        .from('document_sequences')
        .insert({
          company_id,
          branch_id,
          document_type: 'invoice',
          prefix: 'INV-',
          current_number: 1,
          padding_zeros: 4,
          financial_year: `${fyStartYear}-${fyEndYear}`,
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
      documentNumber = `${branchPrefix}-${newSequence.prefix || 'INV-'}${paddedNumber}/${currentFY}`
    } else {
      if (sequence.financial_year !== `${fyStartYear}-${fyEndYear}` && sequence.reset_frequency === 'yearly') {
        const { error: resetError } = await supabaseAdmin
          .from('document_sequences')
          .update({
            current_number: 1,
            financial_year: `${fyStartYear}-${fyEndYear}`,
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
      documentNumber = `${branchPrefix}-${sequence.prefix || 'INV-'}${paddedNumber}/${currentFY}`
      
      const { error: updateSeqError } = await supabaseAdmin
        .from('document_sequences')
        .update({ 
          current_number: currentNumberForInvoice + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequence.id)

      if (updateSeqError) {
        console.error('Warning: Failed to update sequence number:', updateSeqError)
      }
    }

    // ✅ PROCESS ITEMS
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
        purchase_price: item.purchase_price || null,
        selling_price: item.selling_price || null
      })
    }

    const beforeDiscount = subtotal + totalTax
    const docDiscountPercentage = Number(parseFloat(discount_percentage) || 0)
    const docDiscountAmount = Number(parseFloat(discount_amount) || 0)
    
    let finalDiscountAmount = 0
    if (docDiscountPercentage > 0) {
      finalDiscountAmount = (beforeDiscount * docDiscountPercentage) / 100
    } else if (docDiscountAmount > 0) {
      finalDiscountAmount = docDiscountAmount
    }

    // ✅ NEW: Apply customer discount (additional, if no line discount given)
    let customerDiscountApplied = 0
    let finalTotal = beforeDiscount - finalDiscountAmount
    
    if (customer.discount_percentage > 0 && docDiscountPercentage === 0 && docDiscountAmount === 0) {
      customerDiscountApplied = (finalTotal * parseFloat(customer.discount_percentage)) / 100
      finalTotal = finalTotal - customerDiscountApplied
    }

    // ✅ Round total to match frontend calculation
    finalTotal = Math.round(finalTotal)

    // ✅ NEW: Update customer credit used
    const newCreditUsed = creditUsed + parseFloat(finalTotal)
    await supabaseAdmin
      .from('customers')
      .update({ credit_used: newCreditUsed })
      .eq('id', customer_id)
      .eq('company_id', company_id)

    // ✅ CREATE INVOICE
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
        customer_gstin: customer.gstin || null,
        billing_address: customer.billing_address,
        shipping_address: customer.shipping_address || customer.billing_address,
        parent_document_id: parent_document_id || null,
        subtotal,
        discount_amount: finalDiscountAmount,
        discount_percentage: docDiscountPercentage,
        tax_amount: totalTax,
        total_amount: parseFloat(finalTotal),
        balance_amount: parseFloat(finalTotal),
        paid_amount: 0,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        gst_type: gstType, // ✅ Add GST type to invoice
        customer_discount_percentage: parseFloat(customer.discount_percentage || 0),
        customer_discount_amount: customerDiscountApplied,
        notes: notes || null,
        terms_conditions: terms_conditions || null,
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

    // ✅ INSERT ITEMS IN PARALLEL with ledger entry
    const itemsToInsert = processedItems.map(item => ({
      ...item,
      document_id: invoice.id
    }))

    // Get latest ledger balance for customer
    const { data: latestLedger } = await supabaseAdmin
      .from('customer_ledger_entries')
      .select('balance')
      .eq('customer_id', customer_id)
      .eq('company_id', company_id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousBalance = latestLedger?.balance || 0;
    const invoiceAmount = parseFloat(finalTotal);
    const newBalance = parseFloat(previousBalance) + invoiceAmount;

    // ✅ PARALLEL: Insert items and ledger entry
    const [itemsResult, ledgerResult, inventoryResult] = await Promise.all([
      // Insert items
      supabaseAdmin
        .from('sales_document_items')
        .insert(itemsToInsert),

      // Create ledger entry
      supabaseAdmin
        .from('customer_ledger_entries')
        .insert({
          company_id,
          customer_id,
          entry_date: document_date,
          entry_type: 'invoice',
          reference_type: 'sales_document',
          reference_id: invoice.id,
          reference_number: documentNumber,
          debit_amount: invoiceAmount,
          credit_amount: 0,
          balance: newBalance,
          description: `Sales Invoice - ${documentNumber}`,
          created_at: new Date().toISOString()
        }),

      // Update inventory movements (parallel)
      Promise.all(
        processedItems.map(item => {
          if (!item.item_id) return Promise.resolve();
          
          return supabaseAdmin
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
              movement_date: document_date,
              notes: `Sales invoice: ${documentNumber}`,
              created_at: new Date().toISOString()
            })
        })
      )
    ])

    const { error: itemsError } = itemsResult
    const { error: ledgerError } = ledgerResult

    if (itemsError) {
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

    if (ledgerError) {
      console.error('Warning: Failed to create ledger entry:', ledgerError)
    }

    if (parent_document_id) {
      await supabaseAdmin
        .from('sales_documents')
        .update({ status: 'invoiced' })
        .eq('id', parent_document_id)
        .eq('company_id', company_id)
    }

    // Fetch complete invoice
    const { data: completeInvoice } = await supabaseAdmin
      .from('sales_documents')
      .select(`
        *,
        customer:customers(id, name, company_name, customer_code, customer_type, email, phone),
        items:sales_document_items(*)
      `)
      .eq('id', invoice.id)
      .single()

    console.log('✅ Invoice created:', documentNumber)

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: completeInvoice
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

export default withAuth(handler)