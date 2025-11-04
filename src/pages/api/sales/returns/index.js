// pages/api/sales/returns/index.js - Credit Notes API with branch support
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getReturns(req, res)
      case 'POST':
        return await createReturn(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Sales Return API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getReturns(req, res) {
  const {
    company_id,
    branch_id,
    customer_id,
    status,
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
    .eq('document_type', 'credit_note')

  if (branch_id) {
    query = query.eq('branch_id', branch_id)
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id)
  }

  if (status) {
    query = query.eq('status', status)
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

  query = query.order(sort_by, { ascending: sort_order === 'asc' })

  const offset = (parseInt(page) - 1) * parseInt(limit)
  query = query.range(offset, offset + parseInt(limit) - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching credit notes:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch credit notes'
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

async function createReturn(req, res) {
  const {
    company_id,
    branch_id,
    customer_id,
    invoice_id,
    document_date,
    items,
    notes,
    reason,
    discount_percentage,
    discount_amount
  } = req.body

  if (!company_id || !branch_id || !customer_id || !document_date || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
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
      return res.status(400).json({
        success: false,
        error: 'Branch not found'
      })
    }

    const branchPrefix = branch.document_prefix || 'BR'

    // Fetch customer details
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('name, customer_code, gstin, billing_address, shipping_address')
      .eq('id', customer_id)
      .eq('company_id', company_id)
      .single()

    if (customerError || !customer) {
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

    // Fetch document sequence
    const { data: sequence, error: sequenceError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('branch_id', branch_id)
      .eq('document_type', 'credit_note')
      .eq('is_active', true)
      .maybeSingle()

    let currentNumberForCN
    let documentNumber

    if (!sequence) {
      const { data: newSequence, error: createSeqError } = await supabaseAdmin
        .from('document_sequences')
        .insert({
          company_id,
          branch_id,
          document_type: 'credit_note',
          prefix: 'CN-',
          current_number: 1,
          padding_zeros: 4,
          financial_year: currentFY,
          reset_frequency: 'yearly',
          is_active: true
        })
        .select()
        .single()

      if (createSeqError) {
        console.error('Error creating sequence:', createSeqError)
        return res.status(500).json({
          success: false,
          error: 'Failed to create document sequence'
        })
      }

      currentNumberForCN = 1
      const paddedNumber = currentNumberForCN.toString().padStart(4, '0')
      documentNumber = `${branchPrefix}-CN-${paddedNumber}/${currentFY.substring(2)}`
    } else {
      if (sequence.financial_year !== currentFY && sequence.reset_frequency === 'yearly') {
        const { error: resetError } = await supabaseAdmin
          .from('document_sequences')
          .update({
            current_number: 1,
            financial_year: currentFY,
            updated_at: new Date().toISOString()
          })
          .eq('id', sequence.id)

        if (resetError) {
          console.error('Error resetting sequence:', resetError)
          return res.status(500).json({
            success: false,
            error: 'Failed to reset sequence'
          })
        }

        currentNumberForCN = 1
      } else {
        currentNumberForCN = sequence.current_number
      }

      const paddedNumber = currentNumberForCN.toString().padStart(sequence.padding_zeros || 4, '0')
      documentNumber = `${branchPrefix}-${sequence.prefix || ''}${paddedNumber}/${currentFY.substring(2)}`
    }

    // Calculate totals from items
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
        hsn_sac_code: item.hsn_sac_code || null
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

    // Create credit note
    const { data: creditNote, error: cnError } = await supabaseAdmin
      .from('sales_documents')
      .insert({
        company_id,
        branch_id,
        document_type: 'credit_note',
        document_number: documentNumber,
        document_date,
        customer_id,
        customer_name: customer.name,
        customer_code: customer.customer_code,
        customer_gstin: customer.gstin || null,
        billing_address: customer.billing_address,
        shipping_address: customer.shipping_address || customer.billing_address,
        invoice_id: invoice_id || null,
        subtotal,
        discount_amount: finalDiscountAmount,
        discount_percentage: docDiscountPercentage,
        tax_amount: totalTax,
        total_amount: totalAmount,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        notes: notes || null,
        reason: reason || null,
        // status removed as per requirement to simplify workflow
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (cnError) {
      console.error('Error creating credit note:', cnError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create credit note'
      })
    }

    // Insert credit note items
    const itemsToInsert = processedItems.map(item => ({
      ...item,
      document_id: creditNote.id
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('sales_document_items')
      .insert(itemsToInsert)

    if (itemsError) {
      await supabaseAdmin
        .from('sales_documents')
        .delete()
        .eq('id', creditNote.id)

      console.error('Error creating credit note items:', itemsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create credit note items'
      })
    }

    // Update inventory (add stock back)
    for (const item of processedItems) {
      const { data: itemData } = await supabaseAdmin
        .from('items')
        .select('current_stock, track_inventory')
        .eq('id', item.item_id)
        .single()

      if (itemData && itemData.track_inventory) {
        const newStock = parseFloat(itemData.current_stock) + item.quantity

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
            movement_type: 'in',
            quantity: item.quantity,
            rate: item.rate,
            value: item.quantity * item.rate,
            reference_type: 'sales_document',
            reference_id: creditNote.id,
            reference_number: documentNumber,
            stock_before: itemData.current_stock,
            stock_after: newStock,
            movement_date: document_date,
            notes: `Credit note: ${documentNumber}`,
            created_at: new Date().toISOString()
          })
      }
    }

    // If linked to invoice, update invoice amounts
    if (invoice_id) {
      const { data: invoice } = await supabaseAdmin
        .from('sales_documents')
        .select('total_amount, paid_amount, balance_amount')
        .eq('id', invoice_id)
        .single()

      if (invoice) {
        const newTotalAmount = parseFloat(invoice.total_amount) - totalAmount
        const newBalanceAmount = newTotalAmount - parseFloat(invoice.paid_amount || 0)

        await supabaseAdmin
          .from('sales_documents')
          .update({
            total_amount: Math.max(0, newTotalAmount),
            balance_amount: Math.max(0, newBalanceAmount),
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice_id)
      }
    }

    // Create customer ledger entry
    await supabaseAdmin
      .from('customer_ledger_entries')
      .insert({
        company_id,
        customer_id,
        entry_type: 'credit_note',
        amount: totalAmount,
        balance_effect: 'credit',
        reference_type: 'sales_document',
        reference_id: creditNote.id,
        reference_number: documentNumber,
        entry_date: document_date,
        notes: notes || `Credit note: ${documentNumber}`,
        created_at: new Date().toISOString()
      })

    // Increment sequence number
    const nextNumber = currentNumberForCN + 1
    const { error: updateSeqError } = await supabaseAdmin
      .from('document_sequences')
      .update({
        current_number: nextNumber,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', company_id)
      .eq('branch_id', branch_id)
      .eq('document_type', 'credit_note')
      .eq('current_number', currentNumberForCN)

    if (updateSeqError) {
      console.error('Warning: Failed to update sequence number:', updateSeqError)
    }

    return res.status(201).json({
      success: true,
      message: 'Credit note created successfully',
      data: {
        ...creditNote,
        items: itemsToInsert
      }
    })

  } catch (error) {
    console.error('Error creating credit note:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create credit note',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)
