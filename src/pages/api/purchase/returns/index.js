// pages/api/purchase/returns/index.js - UPDATED: Branch-based document numbering
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
    console.error('Returns API error:', error)
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
    vendor_id,
    bill_id,
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
    .eq('document_type', 'debit_note')

  // 🔥 NEW: Filter by branch if provided
  if (branch_id) {
    query = query.eq('branch_id', branch_id)
  }

  if (vendor_id) query = query.eq('vendor_id', vendor_id)
  if (bill_id) query = query.eq('parent_document_id', bill_id)
  if (status) query = query.eq('status', status)
  if (from_date) query = query.gte('document_date', from_date)
  if (to_date) query = query.lte('document_date', to_date)

  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      document_number.ilike.%${searchTerm}%,
      vendor_name.ilike.%${searchTerm}%,
      notes.ilike.%${searchTerm}%
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
      error: 'Failed to fetch returns'
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
    branch_id,
    vendor_id,
    bill_id,
    document_date,
    items,
    return_reason,
    notes
  } = req.body

  if (!company_id || !branch_id || !vendor_id || !bill_id || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, branch ID, vendor ID, bill ID, and items are required'
    })
  }

  let documentNumber = null
  let sequenceId = null
  let currentNumberForReturn = null
  
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
      .eq('document_type', 'debit_note')
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
      documentNumber = `${branchPrefix}-DN-0001/${currentFY.substring(2)}`
      currentNumberForReturn = 1
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
        
        currentNumberForReturn = 1
        console.log('✅ Sequence reset: DN gets #1, sequence now at 2')
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
          console.error('❌ Failed to increment sequence:', incrementError)
          
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
              currentNumberForReturn = freshSeq.current_number
              console.log('✅ Sequence incremented on retry:', currentNumberForReturn)
            } else {
              return res.status(500).json({
                success: false,
                error: 'Failed to generate document number'
              })
            }
          }
        } else {
          currentNumberForReturn = sequence.current_number
          console.log('✅ Sequence incremented:', currentNumberForReturn)
        }
      }

      const paddedNumber = currentNumberForReturn.toString().padStart(sequence.padding_zeros || 4, '0')
      documentNumber = `${branchPrefix}-${sequence.prefix || ''}${paddedNumber}/${currentFY.substring(2)}`
      
      console.log('✅ Generated debit note number:', documentNumber)
    }
  } catch (error) {
    console.error('❌ Error in document number generation:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate document number',
      details: error.message
    })
  }

  // STEP 2: Fetch bill details to validate and check payment status
  const { data: bill, error: billError } = await supabaseAdmin
    .from('purchase_documents')
    .select('*')
    .eq('id', bill_id)
    .eq('company_id', company_id)
    .single()

  if (billError || !bill) {
    return res.status(400).json({
      success: false,
      error: 'Bill not found'
    })
  }

  const isBillPaid = bill.payment_status === 'paid' || parseFloat(bill.balance_amount) === 0

  // STEP 3: Fetch vendor details
  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from('vendors')
    .select('vendor_name, gstin, advance_amount')
    .eq('id', vendor_id)
    .eq('company_id', company_id)
    .single()

  if (vendorError || !vendor) {
    return res.status(400).json({
      success: false,
      error: 'Vendor not found'
    })
  }

  // STEP 4: Process return items
  let subtotal = 0
  let totalTax = 0
  let cgstAmount = 0
  let sgstAmount = 0
  let igstAmount = 0
  let totalDiscountAmount = 0

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
    totalDiscountAmount += discountAmount

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

  // Set debit note status based on bill status
  const debitNoteStatus = isBillPaid ? 'approved' : 'pending'
  const debitNotePaymentStatus = isBillPaid ? 'paid' : 'unpaid'

  console.log(`📋 Debit Note Status: ${debitNoteStatus} | Payment Status: ${debitNotePaymentStatus}`)

  // STEP 5: Prepare debit note data with branch_id
  const debitNoteData = {
    company_id,
    branch_id,  // 🔥 NEW: Add branch_id
    document_type: 'debit_note',
    document_number: documentNumber,
    document_date: document_date || new Date().toISOString().split('T')[0],
    vendor_id,
    vendor_name: vendor.vendor_name,
    vendor_gstin: vendor.gstin || null,
    parent_document_id: bill_id,
    billing_address: bill.billing_address || {},
    shipping_address: bill.shipping_address || {},
    subtotal,
    discount_amount: totalDiscountAmount,
    discount_percentage: 0,
    tax_amount: totalTax,
    total_amount: totalAmount,
    paid_amount: isBillPaid ? totalAmount : 0,
    balance_amount: isBillPaid ? 0 : totalAmount,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    cess_amount: 0,
    status: debitNoteStatus,
    payment_status: debitNotePaymentStatus,
    return_reason: return_reason || null,
    notes: notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  console.log('💾 Creating debit note:', {
    number: documentNumber,
    status: debitNoteStatus,
    payment_status: debitNotePaymentStatus,
    amount: totalAmount
  })

  // STEP 6: Insert debit note
  const { data: debitNote, error: debitNoteError } = await supabaseAdmin
    .from('purchase_documents')
    .insert(debitNoteData)
    .select()
    .single()

  if (debitNoteError) {
    console.error('❌ Error creating debit note:', debitNoteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to create debit note',
      details: process.env.NODE_ENV === 'development' ? debitNoteError.message : undefined
    })
  }

  console.log('✅ Debit note created successfully')

  // STEP 7: Insert debit note items
  const itemsToInsert = processedItems.map(item => ({
    ...item,
    document_id: debitNote.id
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('purchase_document_items')
    .insert(itemsToInsert)

  if (itemsError) {
    console.error('❌ Error creating debit note items:', itemsError)
    
    await supabaseAdmin
      .from('purchase_documents')
      .delete()
      .eq('id', debitNote.id)

    return res.status(500).json({
      success: false,
      error: 'Failed to create debit note items'
    })
  }

  console.log('✅ Debit note items created successfully')

  // STEP 8: Reverse inventory movements
  console.log('📦 Reversing inventory movements...')
  
  for (let i = 0; i < processedItems.length; i++) {
    const item = processedItems[i]
    
    try {
      console.log(`[${i + 1}/${processedItems.length}] Processing: ${item.item_name}, Qty: ${item.quantity}`)
      
      const { error: movementError } = await supabaseAdmin
        .from('inventory_movements')
        .insert({
          company_id,
          item_id: item.item_id,
          item_code: item.item_code,
          movement_type: 'out',
          quantity: item.quantity,
          rate: item.rate,
          value: item.total_amount,
          reference_type: 'debit_note',
          reference_id: debitNote.id,
          reference_number: debitNote.document_number,
          notes: `Debit Note #${debitNote.document_number} - Return to ${vendor.vendor_name}`,
          movement_date: debitNote.document_date,
          created_at: new Date().toISOString()
        })

      if (movementError) {
        console.error(`   ❌ Movement insert failed:`, movementError)
      } else {
        console.log(`   ✅ Movement created (trigger updates stock automatically)`)
      }

    } catch (error) {
      console.error(`❌ Error processing ${item.item_name}:`, error)
    }
  }

  console.log('✅ Inventory movements reversed')

  // STEP 9: Handle Bill Balance & Vendor Advance
  try {
    if (isBillPaid) {
      console.log('💰 Bill is PAID - Creating vendor advance for return amount: ₹', totalAmount.toFixed(2))
      
      const { error: advanceError } = await supabaseAdmin
        .from('vendor_advances')
        .insert({
          company_id,
          vendor_id,
          advance_type: 'created',
          amount: totalAmount,
          source_type: 'debit_note',
          source_id: debitNote.id,
          source_number: debitNote.document_number,
          notes: `Advance from paid bill return - DN #${debitNote.document_number}`,
          created_at: new Date().toISOString()
        })

      if (advanceError) {
        console.error('❌ Failed to create vendor advance record:', advanceError)
      } else {
        console.log('✅ Vendor advance record created')
        
        const currentAdvance = parseFloat(vendor.advance_amount || 0)
        const newAdvanceBalance = currentAdvance + totalAmount
        
        const { error: vendorUpdateError } = await supabaseAdmin
          .from('vendors')
          .update({
            advance_amount: newAdvanceBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', vendor_id)

        if (vendorUpdateError) {
          console.error('❌ Failed to update vendor advance balance:', vendorUpdateError)
        } else {
          console.log(`✅ Vendor advance updated: ₹${currentAdvance.toFixed(2)} → ₹${newAdvanceBalance.toFixed(2)}`)
        }
      }
      
      console.log('ℹ️ Bill balance unchanged (already paid in full)')
      
    } else {
      console.log('💳 Bill is UNPAID - Reducing bill balance by: ₹', totalAmount.toFixed(2))
      
      const currentBillBalance = parseFloat(bill.balance_amount || 0)
      const newBillBalance = Math.max(0, currentBillBalance - totalAmount)
      
      const { error: billUpdateError } = await supabaseAdmin
        .from('purchase_documents')
        .update({
          balance_amount: newBillBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', bill_id)
      
      if (billUpdateError) {
        console.error('❌ Error updating bill balance:', billUpdateError)
      } else {
        console.log(`✅ Bill balance updated: ₹${currentBillBalance.toFixed(2)} → ₹${newBillBalance.toFixed(2)}`)
      }
      
      console.log('ℹ️ No advance created (bill was unpaid)')
    }
  } catch (error) {
    console.error('❌ Error in bill/advance handling:', error)
  }

  console.log('✅ Vendor balance will be updated by database trigger')

  // STEP 10: Fetch complete debit note
  const { data: completeDebitNote } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone, advance_amount),
      items:purchase_document_items(*)
    `)
    .eq('id', debitNote.id)
    .single()

  console.log('🎉 Debit note creation completed successfully!')
  console.log('📊 Summary:')
  console.log(`   Debit Note: ${documentNumber}`)
  console.log(`   Status: ${debitNoteStatus}`)
  console.log(`   Payment Status: ${debitNotePaymentStatus}`)
  console.log(`   Return Amount: ₹${totalAmount.toFixed(2)}`)
  console.log(`   Items: ${processedItems.length}`)
  console.log(`   Advance Created: ${isBillPaid ? 'YES' : 'NO'}`)

  return res.status(201).json({
    success: true,
    message: `Debit note created successfully${isBillPaid ? ' and vendor advance updated' : ''}`,
    data: completeDebitNote,
    advance_created: isBillPaid,
    advance_amount: isBillPaid ? totalAmount : 0
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