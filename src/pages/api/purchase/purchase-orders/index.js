// pages/api/purchase/purchase-orders/index.js - UPDATED: Branch-based document numbering
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getPurchaseOrders(req, res)
      case 'POST':
        return await createPurchaseOrder(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Purchase Orders API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getPurchaseOrders(req, res) {
  const {
    company_id,
    branch_id,
    vendor_id,
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
    .from('purchase_documents')
    .select('*, vendor:vendors(vendor_name, vendor_code)', { count: 'exact' })
    .eq('company_id', company_id)
    .eq('document_type', 'purchase_order')

  // 🔥 NEW: Filter by branch if provided
  if (branch_id) {
    query = query.eq('branch_id', branch_id)
  }

  if (vendor_id) query = query.eq('vendor_id', vendor_id)
  if (status) query = query.eq('status', status)
  if (from_date) query = query.gte('document_date', from_date)
  if (to_date) query = query.lte('document_date', to_date)

  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      document_number.ilike.%${searchTerm}%,
      vendor_name.ilike.%${searchTerm}%,
      vendor_invoice_number.ilike.%${searchTerm}%
    `)
  }

  const allowedSortFields = ['document_date', 'document_number', 'vendor_name', 'total_amount', 'created_at']
  const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'document_date'
  query = query.order(sortField, { ascending: sort_order === 'asc' })

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum
  query = query.range(offset, offset + limitNum - 1)

  const { data: purchaseOrders, error, count } = await query

  if (error) {
    console.error('Error fetching purchase orders:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase orders'
    })
  }

  const totalPages = Math.ceil(count / limitNum)

  return res.status(200).json({
    success: true,
    data: purchaseOrders,
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

async function createPurchaseOrder(req, res) {
  const {
    company_id,
    branch_id,
    vendor_id,
    document_date,
    due_date,
    billing_address,
    shipping_address,
    items,
    notes,
    terms_conditions,
    // status removed as per requirement to simplify workflow
  } = req.body

  if (!company_id || !branch_id || !vendor_id || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, branch ID, vendor ID, and items are required'
    })
  }

  let documentNumber = null
  let sequenceId = null
  let currentNumberForPO = null
  
  try {
    const currentFY = getCurrentFinancialYear()
    
    // 🆕 Get branch details for prefix
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
    
    const { data: sequence, error: seqError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('branch_id', branch_id)  // 🔥 Filter by branch
      .eq('document_type', 'purchase_order')
      .eq('is_active', true)
      .maybeSingle()

    if (seqError) {
      console.error('❌ Error fetching sequence:', seqError)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch document sequence'
      })
    }

    if (!sequence) {
      console.log('⚠️ No sequence found, using fallback')
      documentNumber = `${branchPrefix}-PO-0001/${currentFY.substring(2)}`
      currentNumberForPO = 1
    } else {
      sequenceId = sequence.id
      
      if (sequence.reset_yearly && sequence.financial_year !== currentFY) {
        console.log('📅 Resetting sequence for new FY:', currentFY)
        
        const { data: resetSeq, error: resetError } = await supabaseAdmin
          .from('document_sequences')
          .update({
            current_number: 2,
            financial_year: currentFY,
            updated_at: new Date().toISOString()
          })
          .eq('id', sequence.id)
          .select()
          .single()
        
        if (resetError) {
          console.error('❌ Failed to reset sequence:', resetError)
          return res.status(500).json({
            success: false,
            error: 'Failed to reset document sequence for new financial year'
          })
        }
        
        currentNumberForPO = 1
        console.log('✅ Sequence reset: PO gets #1, sequence now at 2')
      } else {
        const { data: updatedSeq, error: incrementError } = await supabaseAdmin
          .from('document_sequences')
          .update({ 
            current_number: sequence.current_number + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', sequenceId)
          .eq('current_number', sequence.current_number)
          .select()
          .single()
        
        if (incrementError || !updatedSeq) {
          const { data: freshSeq } = await supabaseAdmin
            .from('document_sequences')
            .select('*')
            .eq('id', sequenceId)
            .single()
          
          if (freshSeq) {
            const { data: retryUpdate } = await supabaseAdmin
              .from('document_sequences')
              .update({ 
                current_number: freshSeq.current_number + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', sequenceId)
              .eq('current_number', freshSeq.current_number)
              .select()
              .single()
            
            if (retryUpdate) {
              currentNumberForPO = freshSeq.current_number
              console.log('✅ Sequence incremented on retry:', currentNumberForPO)
            } else {
              return res.status(500).json({
                success: false,
                error: 'Failed to generate document number'
              })
            }
          }
        } else {
          currentNumberForPO = sequence.current_number
          console.log('✅ Sequence incremented:', currentNumberForPO)
        }
      }

      const paddedNumber = currentNumberForPO.toString().padStart(sequence.padding_zeros || 4, '0')
      documentNumber = `${branchPrefix}-${sequence.prefix || ''}${paddedNumber}/${currentFY.substring(2)}`
      
      console.log('✅ Generated PO number:', documentNumber)
    }
  } catch (error) {
    console.error('❌ Error in document number generation:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate document number',
      details: error.message
    })
  }

  // ✅ STEP 2: Fetch vendor details
  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from('vendors')
    .select('vendor_name, gstin, billing_address, shipping_address')
    .eq('id', vendor_id)
    .eq('company_id', company_id)
    .single()

  if (vendorError || !vendor) {
    return res.status(400).json({
      success: false,
      error: 'Vendor not found'
    })
  }

  // ✅ STEP 3: Calculate totals
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

  // ✅ STEP 4: Prepare PO data with branch_id
  const poData = {
    company_id,
    branch_id,  // 🔥 NEW: Add branch_id
    document_type: 'purchase_order',
    document_number: documentNumber,
    document_date: document_date || new Date().toISOString().split('T')[0],
    due_date: due_date || null,
    vendor_id,
    vendor_name: vendor.vendor_name,
    vendor_gstin: vendor.gstin || null,
    billing_address: billing_address || vendor.billing_address || {},
    shipping_address: shipping_address || vendor.shipping_address || {},
    subtotal,
    discount_amount: 0,
    discount_percentage: 0,
    tax_amount: totalTax,
    total_amount: totalAmount,
    paid_amount: 0,
    balance_amount: totalAmount,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    cess_amount: 0,
    // status removed as per requirement to simplify workflow
    payment_status: 'unpaid',
    notes: notes || null,
    terms_conditions: terms_conditions || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  console.log('💾 Creating purchase order with number:', documentNumber)

  // ✅ STEP 5: Insert PO
  const { data: purchaseOrder, error: poError } = await supabaseAdmin
    .from('purchase_documents')
    .insert(poData)
    .select()
    .single()

  if (poError) {
    console.error('❌ Error creating purchase order:', poError)
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create purchase order',
      details: process.env.NODE_ENV === 'development' ? poError.message : undefined
    })
  }

  console.log('✅ Purchase order created successfully')

  // ✅ STEP 6: Insert PO items
  const itemsToInsert = processedItems.map(item => ({
    ...item,
    document_id: purchaseOrder.id
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('purchase_document_items')
    .insert(itemsToInsert)

  if (itemsError) {
    console.error('❌ Error creating PO items:', itemsError)
    
    await supabaseAdmin
      .from('purchase_documents')
      .delete()
      .eq('id', purchaseOrder.id)

    return res.status(500).json({
      success: false,
      error: 'Failed to create purchase order items'
    })
  }

  console.log('✅ Purchase order items created successfully')

  // ✅ STEP 7: Fetch complete PO
  const { data: completePO } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*)
    `)
    .eq('id', purchaseOrder.id)
    .single()

  console.log('🎉 Purchase order creation completed successfully!')

  return res.status(201).json({
    success: true,
    message: 'Purchase order created successfully',
    data: completePO
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