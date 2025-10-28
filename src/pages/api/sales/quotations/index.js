// pages/api/sales/quotations/index.js - FIXED FOR YOUR ACTUAL SCHEMA
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getQuotations(req, res)
      case 'POST':
        return await createQuotation(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Quotations API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getQuotations(req, res) {
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
    .eq('document_type', 'quotation')

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

  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      document_number.ilike.%${searchTerm}%,
      customer_name.ilike.%${searchTerm}%,
      reference_number.ilike.%${searchTerm}%
    `)
  }

  const allowedSortFields = ['document_date', 'document_number', 'customer_name', 'total_amount', 'created_at']
  const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'document_date'
  query = query.order(sortField, { ascending: sort_order === 'asc' })

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum
  query = query.range(offset, offset + limitNum - 1)

  const { data: quotations, error, count } = await query

  if (error) {
    console.error('Error fetching quotations:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch quotations'
    })
  }

  const totalPages = Math.ceil(count / limitNum)

  return res.status(200).json({
    success: true,
    data: quotations,
    pagination: {
      current_page: pageNum,
      total_pages: totalPages,
      total_records: count,
      per_page: limitNum,
      has_next_page: pageNum < totalPages,
      has_prev_page: pageNum > 1
    }
  })
}

async function createQuotation(req, res) {
  const {
    company_id,
    branch_id,
    customer_id,
    document_date,
    valid_until,
    reference_number,
    billing_address,
    shipping_address,
    items,
    notes,
    terms_conditions,
    discount_percentage = 0,
    discount_amount = 0
  } = req.body

  if (!company_id || !branch_id || !customer_id || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, branch ID, customer ID, and items are required'
    })
  }

  let documentNumber = null

  try {
    // Get financial year based on document date
    const docDate = new Date(document_date || new Date())
    const currentMonth = docDate.getMonth()
    const currentYear = docDate.getFullYear()
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1
    const fyEndYear = fyStartYear + 1
    const currentFY = `${fyStartYear}-${fyEndYear.toString().padStart(4, '0')}`

    console.log('📅 Current Financial Year:', currentFY)

    // Get branch details for prefix
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('document_prefix, name')
      .eq('id', branch_id)
      .eq('company_id', company_id)
      .single()

    if (branchError || !branch) {
      console.error('❌ Branch not found:', branchError)
      return res.status(400).json({
        success: false,
        error: 'Branch not found'
      })
    }

    const branchPrefix = branch.document_prefix || 'BR'
    console.log('🏢 Branch prefix:', branchPrefix)

    // Fetch document sequence with branch filter
    const { data: sequence, error: sequenceError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('branch_id', branch_id)
      .eq('document_type', 'quotation')
      .eq('is_active', true)
      .maybeSingle()

    if (sequenceError) {
      console.error('❌ Error fetching sequence:', sequenceError)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch document sequence',
        details: sequenceError.message
      })
    }

    let currentNumberForQuotation

    if (!sequence) {
      console.log('⚠️ No sequence found, creating new sequence')
      
      const { data: newSequence, error: createSeqError } = await supabaseAdmin
        .from('document_sequences')
        .insert({
          company_id,
          branch_id,
          document_type: 'quotation',
          prefix: 'QT-',
          suffix: '',
          current_number: 1,
          padding_zeros: 4,
          financial_year: currentFY,
          reset_yearly: true,
          sample_format: `${branchPrefix}-QT-####/${currentFY.substring(2)}`,
          is_active: true
        })
        .select()
        .single()

      if (createSeqError) {
        console.error('❌ Error creating sequence:', createSeqError)
        return res.status(500).json({
          success: false,
          error: 'Failed to create document sequence',
          details: process.env.NODE_ENV === 'development' ? createSeqError.message : undefined
        })
      }

      currentNumberForQuotation = 1
      const paddedNumber = currentNumberForQuotation.toString().padStart(4, '0')
      documentNumber = `${branchPrefix}-QT-${paddedNumber}/${currentFY.substring(2)}`

      const { error: updateSeqError } = await supabaseAdmin
        .from('document_sequences')
        .update({
          current_number: 2,
          updated_at: new Date().toISOString()
        })
        .eq('id', newSequence.id)

      if (updateSeqError) {
        console.error('⚠️ Warning: Failed to update sequence number:', updateSeqError)
      }

      console.log('✅ Created new sequence, document number:', documentNumber)
    } else {
      console.log('✅ Found existing sequence')

      if (sequence.financial_year !== currentFY && sequence.reset_yearly) {
        console.log('📅 Resetting sequence for new FY:', currentFY)

        const { error: resetError } = await supabaseAdmin
          .from('document_sequences')
          .update({
            current_number: 2,
            financial_year: currentFY,
            updated_at: new Date().toISOString()
          })
          .eq('id', sequence.id)

        if (resetError) {
          console.error('❌ Failed to reset sequence:', resetError)
          return res.status(500).json({
            success: false,
            error: 'Failed to reset document sequence for new financial year'
          })
        }

        currentNumberForQuotation = 1
        console.log('✅ Sequence reset for new FY')
      } else {
        currentNumberForQuotation = sequence.current_number

        const { error: updateSeqError } = await supabaseAdmin
          .from('document_sequences')
          .update({
            current_number: sequence.current_number + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', sequence.id)

        if (updateSeqError) {
          console.error('⚠️ Warning: Failed to update sequence number:', updateSeqError)
        }

        console.log(`✅ Using existing sequence #${currentNumberForQuotation}`)
      }

      const paddedNumber = currentNumberForQuotation.toString().padStart(sequence.padding_zeros || 4, '0')
      documentNumber = `${branchPrefix}-${sequence.prefix || 'QT-'}${paddedNumber}/${currentFY.substring(2)}`
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('name, gstin, billing_address, shipping_address')
      .eq('id', customer_id)
      .eq('company_id', company_id)
      .single()

    if (customerError || !customer) {
      return res.status(400).json({
        success: false,
        error: 'Customer not found'
      })
    }

    // Process items and calculate totals
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

      // ✅ CORRECTED: Only include columns that exist in your schema
      processedItems.push({
        item_id: item.item_id || null,
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
        // ❌ REMOVED: mrp (doesn't exist in your schema)
        // ❌ REMOVED: selling_price (doesn't exist in your schema)
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

    // Prepare quotation data
    const quotationData = {
      company_id,
      branch_id,
      document_type: 'quotation',
      document_number: documentNumber,
      document_date: document_date || new Date().toISOString().split('T')[0],
      valid_until: valid_until || null,
      reference_number: reference_number || null,
      customer_id,
      customer_name: customer.name,
      customer_gstin: customer.gstin || null,
      billing_address: billing_address || customer.billing_address || {},
      shipping_address: shipping_address || customer.shipping_address || {},
      subtotal,
      discount_amount: finalDiscountAmount,
      discount_percentage: docDiscountPercentage,
      tax_amount: totalTax,
      total_amount: totalAmount,
      paid_amount: 0,
      balance_amount: totalAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      cess_amount: 0,
      status: 'draft',
      payment_status: 'unpaid',
      notes: notes || null,
      terms_conditions: terms_conditions || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('💾 Creating quotation with number:', documentNumber)

    // Insert quotation
    const { data: quotation, error: quotationError } = await supabaseAdmin
      .from('sales_documents')
      .insert(quotationData)
      .select()
      .single()

    if (quotationError) {
      console.error('❌ Error creating quotation:', quotationError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create quotation',
        details: process.env.NODE_ENV === 'development' ? quotationError.message : undefined
      })
    }

    console.log('✅ Quotation created successfully')

    // Insert quotation items
    const itemsToInsert = processedItems.map(item => ({
      ...item,
      document_id: quotation.id
    }))

    console.log('📝 Inserting items:', itemsToInsert.length, 'items')

    const { error: itemsError } = await supabaseAdmin
      .from('sales_document_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('❌ Error creating quotation items:', itemsError)

      // Rollback: Delete the quotation if items fail
      await supabaseAdmin
        .from('sales_documents')
        .delete()
        .eq('id', quotation.id)

      return res.status(500).json({
        success: false,
        error: 'Failed to create quotation items',
        details: process.env.NODE_ENV === 'development' ? itemsError.message : undefined
      })
    }

    console.log('✅ Quotation items created successfully')

    // Fetch complete quotation
    const { data: completeQuotation } = await supabaseAdmin
      .from('sales_documents')
      .select(`
        *,
        customer:customers(name, email, gstin),
        items:sales_document_items(*)
      `)
      .eq('id', quotation.id)
      .single()

    console.log('🎉 Quotation creation completed successfully!')
    console.log('📊 Summary:')
    console.log(`   Document Number: ${documentNumber}`)
    console.log(`   Total Amount: ₹${totalAmount}`)
    console.log(`   Items: ${processedItems.length}`)

    return res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: completeQuotation
    })

  } catch (error) {
    console.error('Error creating quotation:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create quotation',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)