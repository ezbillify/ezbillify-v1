// pages/api/purchase/grn/index.js
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

  // ✅ Include items in the query so we can count them
  let query = supabaseAdmin
    .from('purchase_documents')
    .select('*, vendor:vendors(vendor_name, vendor_code), items:purchase_document_items(id)', { count: 'exact' })
    .eq('company_id', company_id)
    .eq('document_type', 'grn')

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

  if (!company_id || !vendor_id || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, vendor ID, and items are required'
    })
  }

  // ✅ STEP 1: Generate document number and increment sequence
  let documentNumber = null
  let sequenceId = null
  
  try {
    const currentFY = getCurrentFinancialYear()
    
    const { data: sequence, error: seqError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
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
      documentNumber = `GRN-0001`
    } else {
      sequenceId = sequence.id
      
      // Check if we need to reset for new financial year
      if (sequence.reset_yearly && sequence.financial_year !== currentFY) {
        console.log('📅 Resetting sequence for new FY:', currentFY)
        const { data: resetSeq, error: resetError } = await supabaseAdmin
          .from('document_sequences')
          .update({
            current_number: 1,
            financial_year: currentFY,
            updated_at: new Date().toISOString()
          })
          .eq('id', sequence.id)
          .select()
          .single()
        
        if (!resetError && resetSeq) {
          sequence.current_number = 1
          sequence.financial_year = currentFY
        }
      }

      const currentNumberForGRN = sequence.current_number
      const nextNumber = currentNumberForGRN + 1
      
      console.log('🔢 Using number', currentNumberForGRN, 'for this GRN, incrementing sequence to', nextNumber)
      
      // Increment sequence BEFORE creating GRN
      const { error: incrementError } = await supabaseAdmin
        .from('document_sequences')
        .update({ 
          current_number: nextNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequenceId)
      
      if (incrementError) {
        console.error('❌ Failed to increment sequence:', incrementError)
        return res.status(500).json({
          success: false,
          error: 'Failed to generate document number'
        })
      }
      
      console.log('✅ Sequence incremented successfully to:', nextNumber)

      const paddedNumber = currentNumberForGRN.toString().padStart(sequence.padding_zeros || 4, '0')
      documentNumber = `${sequence.prefix || ''}${paddedNumber}${sequence.suffix || ''}`
      
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
    if (sequenceId) {
      console.log('⚠️ Vendor not found, rolling back sequence')
      await supabaseAdmin
        .from('document_sequences')
        .update({ 
          current_number: supabaseAdmin.raw('current_number - 1')
        })
        .eq('id', sequenceId)
    }
    
    return res.status(400).json({
      success: false,
      error: 'Vendor not found'
    })
  }

  // ✅ STEP 3: Process items (GRN doesn't need pricing, set defaults)
  const processedItems = items.map(item => {
    const receivedQty = Number(parseFloat(item.received_quantity) || 0);
    
    return {
      item_id: item.item_id,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description || null,
      quantity: receivedQty, // Main quantity = received quantity for GRN
      ordered_quantity: Number(parseFloat(item.ordered_quantity) || 0),
      received_quantity: receivedQty,
      unit_id: item.unit_id || null,
      unit_name: item.unit_name || null,
      hsn_sac_code: item.hsn_sac_code || null,
      // ✅ Default pricing values for GRN (satisfies NOT NULL constraints)
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
    };
  });

  // ✅ STEP 4: Prepare GRN data (no pricing for GRN documents)
  const grnData = {
    company_id,
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
    // ✅ GRN has no financial amounts
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
    
    if (sequenceId) {
      console.log('⚠️ Rolling back sequence increment')
      await supabaseAdmin
        .from('document_sequences')
        .update({ 
          current_number: supabaseAdmin.raw('current_number - 1')
        })
        .eq('id', sequenceId)
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create GRN',
      details: process.env.NODE_ENV === 'development' ? grnError.message : undefined
    })
  }

  console.log('✅ GRN created successfully with ID:', grn.id)

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
    
    // Rollback: Delete the GRN document
    await supabaseAdmin
      .from('purchase_documents')
      .delete()
      .eq('id', grn.id)
    
    // Rollback: Decrement sequence
    if (sequenceId) {
      await supabaseAdmin
        .from('document_sequences')
        .update({ 
          current_number: supabaseAdmin.raw('current_number - 1')
        })
        .eq('id', sequenceId)
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create GRN items',
      details: process.env.NODE_ENV === 'development' ? itemsError.message : undefined
    })
  }

  console.log('✅ GRN items created successfully')

  // ✅ STEP 7: Update PO status if this GRN is linked to a PO
  if (purchase_order_id) {
    console.log('🔄 Updating Purchase Order status...')
    
    // Check if all items from PO are fully received
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
    
    // Calculate total ordered vs total received
    const totalOrdered = poItems?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0
    const totalReceived = allGRNItems?.reduce((sum, grn) => {
      return sum + (grn.items?.reduce((itemSum, item) => itemSum + Number(item.received_quantity || 0), 0) || 0)
    }, 0) || 0
    
    let newPOStatus = 'pending'
    if (totalReceived >= totalOrdered) {
      newPOStatus = 'received'
      console.log('✅ All items received - marking PO as received')
    } else if (totalReceived > 0) {
      newPOStatus = 'partially_received'
      console.log('⚠️ Partial receipt - marking PO as partially_received')
    }
    
    await supabaseAdmin
      .from('purchase_documents')
      .update({ 
        status: newPOStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', purchase_order_id)
    
    console.log(`📊 PO status updated to: ${newPOStatus}`)
  }

  // ✅ STEP 8: Fetch complete GRN with relationships
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
  console.log('📊 Summary:')
  console.log(`   GRN Number: ${documentNumber}`)
  console.log(`   Items: ${processedItems.length}`)
  console.log(`   Total Received Quantity: ${processedItems.reduce((sum, item) => sum + item.received_quantity, 0)}`)

  return res.status(201).json({
    success: true,
    message: 'GRN created successfully',
    data: completeGRN
  })
}

// Helper function for financial year
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