// pages/api/purchase/returns/index.js
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
    console.error('Purchase Return API error:', error)
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
    vendor_id,
    status,
    reason,
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
    .from('purchase_documents')
    .select('*, vendor:vendors(vendor_name, vendor_code)', { count: 'exact' })
    .eq('company_id', company_id)
    .eq('document_type', 'purchase_return')

  if (vendor_id) query = query.eq('vendor_id', vendor_id)
  if (status) query = query.eq('status', status)
  if (reason) query = query.eq('reason', reason)
  if (from_date) query = query.gte('document_date', from_date)
  if (to_date) query = query.lte('document_date', to_date)

  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      document_number.ilike.%${searchTerm}%,
      vendor_name.ilike.%${searchTerm}%
    `)
  }

  const allowedSortFields = ['document_date', 'document_number', 'vendor_name', 'total_amount', 'created_at']
  const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'document_date'
  query = query.order(sortField, { ascending: sort_order === 'asc' })

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum
  query = query.range(offset, offset + limitNum - 1)

  const { data: returns, error, count } = await query

  if (error) {
    console.error('Error fetching returns:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase returns'
    })
  }

  const totalPages = Math.ceil(count / limitNum)

  return res.status(200).json({
    success: true,
    data: returns,
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

async function createReturn(req, res) {
  const {
    company_id,
    vendor_id,
    document_date,
    bill_id,
    reason,
    items,
    notes,
    status = 'draft'
  } = req.body

  if (!company_id || !vendor_id || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, vendor ID, and items are required'
    })
  }

  // Generate document number
  let documentNumber = null
  let sequenceId = null
  
  try {
    const currentFY = getCurrentFinancialYear()
    
    const { data: sequence, error: seqError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('document_type', 'purchase_return')
      .eq('is_active', true)
      .maybeSingle()

    if (!sequence) {
      documentNumber = `PR-0001`
    } else {
      sequenceId = sequence.id
      
      if (sequence.reset_yearly && sequence.financial_year !== currentFY) {
        await supabaseAdmin
          .from('document_sequences')
          .update({
            current_number: 1,
            financial_year: currentFY,
            updated_at: new Date().toISOString()
          })
          .eq('id', sequence.id)
        
        sequence.current_number = 1
        sequence.financial_year = currentFY
      }

      const currentNumberForReturn = sequence.current_number
      const nextNumber = currentNumberForReturn + 1
      
      await supabaseAdmin
        .from('document_sequences')
        .update({ 
          current_number: nextNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequenceId)

      const paddedNumber = currentNumberForReturn.toString().padStart(sequence.padding_zeros || 4, '0')
      documentNumber = `${sequence.prefix || ''}${paddedNumber}${sequence.suffix || ''}`
    }
  } catch (error) {
    console.error('❌ Error generating return number:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate document number'
    })
  }

  // Fetch vendor details
  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from('vendors')
    .select('vendor_name')
    .eq('id', vendor_id)
    .eq('company_id', company_id)
    .single()

  if (vendorError || !vendor) {
    if (sequenceId) {
      await supabaseAdmin
        .from('document_sequences')
        .update({ current_number: supabaseAdmin.raw('current_number - 1') })
        .eq('id', sequenceId)
    }
    
    return res.status(400).json({
      success: false,
      error: 'Vendor not found'
    })
  }

  // Calculate totals
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

  const totalAmount = subtotal + totalTax

  // Prepare return data
  const returnData = {
    company_id,
    document_type: 'purchase_return',
    document_number: documentNumber,
    document_date: document_date || new Date().toISOString().split('T')[0],
    vendor_id,
    vendor_name: vendor.vendor_name,
    parent_document_id: bill_id || null,
    reason: reason || null,
    subtotal,
    tax_amount: totalTax,
    total_amount: totalAmount,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    cess_amount: 0,
    status,
    notes: notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  console.log('💾 Creating purchase return with number:', documentNumber)

  // Insert return
  const { data: returnDoc, error: returnError } = await supabaseAdmin
    .from('purchase_documents')
    .insert(returnData)
    .select()
    .single()

  if (returnError) {
    console.error('❌ Error creating return:', returnError)
    
    if (sequenceId) {
      await supabaseAdmin
        .from('document_sequences')
        .update({ current_number: supabaseAdmin.raw('current_number - 1') })
        .eq('id', sequenceId)
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create purchase return'
    })
  }

  // Insert return items
  const itemsToInsert = processedItems.map(item => ({
    ...item,
    document_id: returnDoc.id
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('purchase_document_items')
    .insert(itemsToInsert)

  if (itemsError) {
    console.error('❌ Error creating return items:', itemsError)
    
    await supabaseAdmin
      .from('purchase_documents')
      .delete()
      .eq('id', returnDoc.id)
    
    if (sequenceId) {
      await supabaseAdmin
        .from('document_sequences')
        .update({ current_number: supabaseAdmin.raw('current_number - 1') })
        .eq('id', sequenceId)
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create return items'
    })
  }

  // Fetch complete return
  const { data: completeReturn } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*)
    `)
    .eq('id', returnDoc.id)
    .single()

  console.log('🎉 Purchase return created successfully!')
  console.log(`   Return Number: ${documentNumber}`)
  console.log(`   Total Amount: ₹${totalAmount}`)

  return res.status(201).json({
    success: true,
    message: 'Purchase return created successfully',
    data: completeReturn
  })
}

function getCurrentFinancialYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`
  }
}

export default withAuth(handler)