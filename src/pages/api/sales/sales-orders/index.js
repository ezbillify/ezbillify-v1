// pages/api/sales/sales-orders/index.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getSalesOrders(req, res)
      case 'POST':
        return await createSalesOrder(req, res)
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

async function getSalesOrders(req, res) {
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
    .eq('document_type', 'sales_order')

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
    console.error('Error fetching sales orders:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales orders'
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

async function createSalesOrder(req, res) {
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

  // Validate required fields
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
    const currentFY = `${fyStartYear.toString().slice(-2)}-${fyEndYear.toString().slice(-2)}`

    // Fetch document sequence with branch filter
    const { data: sequence, error: sequenceError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('branch_id', branch_id)
      .eq('document_type', 'sales_order')
      .eq('is_active', true)
      .maybeSingle()

    let currentNumberForSO
    let documentNumber

    if (!sequence) {
      // Create new sequence for this branch
      const { data: newSequence, error: createSeqError } = await supabaseAdmin
        .from('document_sequences')
        .insert({
          company_id,
          branch_id,
          document_type: 'sales_order',
          prefix: 'SO-',
          current_number: 1,
          padding_zeros: 4,
          financial_year: `${fyStartYear}-${fyEndYear}`,
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

      currentNumberForSO = 1
      const paddedNumber = currentNumberForSO.toString().padStart(4, '0')
      documentNumber = `${branchPrefix}-${newSequence.prefix || 'SO-'}${paddedNumber}/${currentFY}`
    } else {
      // Check if FY has changed, reset sequence if needed
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
          console.error('Error resetting sequence:', resetError)
          return res.status(500).json({
            success: false,
            error: 'Failed to reset sequence for new financial year'
          })
        }

        currentNumberForSO = 1
      } else {
        currentNumberForSO = sequence.current_number
      }

      const paddedNumber = currentNumberForSO.toString().padStart(sequence.padding_zeros || 4, '0')
      documentNumber = `${branchPrefix}-${sequence.prefix || 'SO-'}${paddedNumber}/${currentFY}`
      
      // Increment sequence number for next use
      const nextNumber = currentNumberForSO + 1
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

    // Calculate totals from items (similar to purchase bills and invoices)
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

    // Create sales order document
    const { data: salesOrder, error: soError } = await supabaseAdmin
      .from('sales_documents')
      .insert({
        company_id,
        branch_id,
        document_type: 'sales_order',
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
        total_amount: totalAmount,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        notes: notes || null,
        terms_conditions: terms_conditions || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (soError) {
      console.error('Error creating sales order:', soError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create sales order'
      })
    }

    // Insert sales order items
    const itemsToInsert = processedItems.map(item => ({
      ...item,
      document_id: salesOrder.id
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('sales_document_items')
      .insert(itemsToInsert)

    if (itemsError) {
      // Rollback: delete the sales order
      await supabaseAdmin
        .from('sales_documents')
        .delete()
        .eq('id', salesOrder.id)

      console.error('Error creating sales order items:', itemsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create sales order items'
      })
    }

    // Reserve stock for items
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

    // Update quotation status if linked
    if (parent_document_id) {
      await supabaseAdmin
        .from('sales_documents')
        .update({ status: 'converted' })
        .eq('id', parent_document_id)
        .eq('company_id', company_id)
    }

    // Fetch complete sales order with customer and items
    const { data: completeSalesOrder } = await supabaseAdmin
      .from('sales_documents')
      .select(`
        *,
        customer:customers(name, customer_code, email, phone),
        items:sales_document_items(*)
      `)
      .eq('id', salesOrder.id)
      .single()

    return res.status(201).json({
      success: true,
      message: 'Sales order created successfully',
      data: completeSalesOrder
    })

  } catch (error) {
    console.error('Error creating sales order:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create sales order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)