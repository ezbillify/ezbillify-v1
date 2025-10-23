// pages/api/purchase/grn/index.js - UPDATED: Branch-based document numbering
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getGRNs(req, res)
      case 'POST':
        return await createGRN(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('GRN API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getGRNs(req, res) {
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
    .select('*, vendor:vendors(vendor_name, vendor_code), items:purchase_document_items(id)', { count: 'exact' })
    .eq('company_id', company_id)
    .eq('document_type', 'grn')

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
      delivery_note_number.ilike.%${searchTerm}%,
      vehicle_number.ilike.%${searchTerm}%
    `)
  }

  const allowedSortFields = ['document_date', 'document_number', 'vendor_name', 'created_at']
  const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'document_date'
  query = query.order(sortField, { ascending: sort_order === 'asc' })

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum
  query = query.range(offset, offset + limitNum - 1)

  const { data: grns, error, count } = await query

  if (error) {
    console.error('Error fetching GRNs:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch GRNs'
    })
  }

  const totalPages = Math.ceil(count / limitNum)

  return res.status(200).json({
    success: true,
    data: grns,
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

async function createGRN(req, res) {
  const {
    company_id,
    branch_id,
    vendor_id,
    document_date,
    purchase_order_id,
    delivery_note_number,
    transporter_name,
    vehicle_number,
    items,
    notes,
    status = 'received'
  } = req.body

  if (!company_id || !branch_id || !vendor_id || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, branch ID, vendor ID, and items are required'
    })
  }

  // ✅ STEP 1: Generate document number with BRANCH-BASED sequence
  let documentNumber = null
  let sequenceId = null
  let currentNumberForGRN = null
  
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
      .eq('document_type', 'grn')
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
      documentNumber = `${branchPrefix}-GRN-0001/${currentFY.substring(2)}`
      currentNumberForGRN = 1
    } else {
      sequenceId = sequence.id
      
      // Check if we need to reset for new financial year
      if (sequence.reset_yearly && sequence.financial_year !== currentFY) {
        console.log('📅 Resetting sequence for new FY:', currentFY)
        
        const { data: resetSeq, error: resetError } = await supabaseAdmin
          .from('document_sequences')
          .update({
            current_number: 2,  // ✅ FIXED: Start at 2 so next GRN gets 1
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
        
        currentNumberForGRN = 1
        console.log('✅ Sequence reset: GRN gets #1, sequence now at 2')
      } else {
        // ✅ ATOMIC: Increment with optimistic locking
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
          console.error('❌ Failed to increment sequence:', incrementError)
          
          // ✅ Retry with fresh data
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
              currentNumberForGRN = freshSeq.current_number
              console.log('✅ Sequence incremented on retry:', currentNumberForGRN)
            } else {
              return res.status(500).json({
                success: false,
                error: 'Failed to generate document number'
              })
            }
          }
        } else {
          currentNumberForGRN = sequence.current_number
          console.log('✅ Sequence incremented:', currentNumberForGRN)
        }
      }

      const paddedNumber = currentNumberForGRN.toString().padStart(sequence.padding_zeros || 4, '0')
      documentNumber = `${branchPrefix}-${sequence.prefix || ''}${paddedNumber}/${currentFY.substring(2)}`
      
      console.log('✅ Generated GRN number:', documentNumber)
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
    .select('vendor_name')
    .eq('id', vendor_id)
    .eq('company_id', company_id)
    .single()

  if (vendorError || !vendor) {
    return res.status(400).json({
      success: false,
      error: 'Vendor not found'
    })
  }

  // ✅ STEP 3: Process items
  const processedItems = items.map(item => {
    const receivedQty = Number(parseFloat(item.received_quantity) || 0)
    
    return {
      item_id: item.item_id,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description || null,
      quantity: receivedQty,
      ordered_quantity: Number(parseFloat(item.ordered_quantity) || 0),
      received_quantity: receivedQty,
      unit_id: item.unit_id || null,
      unit_name: item.unit_name || null,
      hsn_sac_code: item.hsn_sac_code || null,
      rate: 0,
      discount_percentage: 0,
      discount_amount: 0,
      taxable_amount: 0,
      tax_rate: 0,
      cgst_rate: 0,
      sgst_rate: 0,
      igst_rate: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      cess_amount: 0,
      total_amount: 0
    }
  })

  // ✅ STEP 4: Prepare GRN data with branch_id
  const grnData = {
    company_id,
    branch_id,  // 🔥 NEW: Add branch_id
    document_type: 'grn',
    document_number: documentNumber,
    document_date: document_date || new Date().toISOString().split('T')[0],
    vendor_id,
    vendor_name: vendor.vendor_name,
    parent_document_id: purchase_order_id || null,
    delivery_note_number: delivery_note_number || null,
    transporter_name: transporter_name || null,
    vehicle_number: vehicle_number || null,
    status,
    notes: notes || null,
    subtotal: 0,
    discount_amount: 0,
    discount_percentage: 0,
    tax_amount: 0,
    total_amount: 0,
    paid_amount: 0,
    balance_amount: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    cess_amount: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  console.log('💾 Creating GRN with number:', documentNumber)

  // ✅ STEP 5: Insert GRN
  const { data: grn, error: grnError } = await supabaseAdmin
    .from('purchase_documents')
    .insert(grnData)
    .select()
    .single()

  if (grnError) {
    console.error('❌ Error creating GRN:', grnError)
    return res.status(500).json({
      success: false,
      error: 'Failed to create GRN',
      details: process.env.NODE_ENV === 'development' ? grnError.message : undefined
    })
  }

  console.log('✅ GRN created successfully')

  // ✅ STEP 6: Insert GRN items
  const itemsToInsert = processedItems.map(item => ({
    ...item,
    document_id: grn.id
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('purchase_document_items')
    .insert(itemsToInsert)

  if (itemsError) {
    console.error('❌ Error creating GRN items:', itemsError)
    
    await supabaseAdmin
      .from('purchase_documents')
      .delete()
      .eq('id', grn.id)

    return res.status(500).json({
      success: false,
      error: 'Failed to create GRN items'
    })
  }

  console.log('✅ GRN items created successfully')

  // ✅ STEP 7: Update PO status if linked
  if (purchase_order_id) {
    const { data: poItems } = await supabaseAdmin
      .from('purchase_document_items')
      .select('quantity')
      .eq('document_id', purchase_order_id)
    
    const { data: allGRNItems } = await supabaseAdmin
      .from('purchase_documents')
      .select(`
        id,
        items:purchase_document_items(received_quantity)
      `)
      .eq('parent_document_id', purchase_order_id)
      .eq('document_type', 'grn')
    
    const totalOrdered = poItems?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0
    const totalReceived = allGRNItems?.reduce((sum, grn) => {
      return sum + (grn.items?.reduce((itemSum, item) => itemSum + Number(item.received_quantity || 0), 0) || 0)
    }, 0) || 0
    
    let newPOStatus = 'pending'
    if (totalReceived >= totalOrdered) {
      newPOStatus = 'received'
    } else if (totalReceived > 0) {
      newPOStatus = 'partially_received'
    }
    
    await supabaseAdmin
      .from('purchase_documents')
      .update({ 
        status: newPOStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', purchase_order_id)
  }

  // ✅ STEP 8: Fetch complete GRN
  const { data: completeGRN } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*)
    `)
    .eq('id', grn.id)
    .single()

  console.log('🎉 GRN creation completed successfully!')

  return res.status(201).json({
    success: true,
    message: 'GRN created successfully',
    data: completeGRN
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