// pages/api/purchase/bills/index.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getBills(req, res)
      case 'POST':
        return await createBill(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Bills API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getBills(req, res) {
  const {
    company_id,
    vendor_id,
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
    .from('purchase_documents')
    .select('*, vendor:vendors(vendor_name, vendor_code)', { count: 'exact' })
    .eq('company_id', company_id)
    .eq('document_type', 'bill')

  if (vendor_id) query = query.eq('vendor_id', vendor_id)
  if (status) query = query.eq('status', status)
  if (payment_status) query = query.eq('payment_status', payment_status)
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

  const { data: bills, error, count } = await query

  if (error) {
    console.error('Error fetching bills:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bills'
    })
  }

  const totalPages = Math.ceil(count / limitNum)

  return res.status(200).json({
    success: true,
    data: bills,
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

async function createBill(req, res) {
  const {
    company_id,
    vendor_id,
    document_date,
    due_date,
    vendor_invoice_number,
    purchase_order_id,
    billing_address,
    shipping_address,
    items,
    notes,
    terms_conditions,
    status = 'received',
    discount_percentage = 0,  // ✅ ADDED
    discount_amount = 0        // ✅ ADDED
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
      .eq('document_type', 'bill')
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
      documentNumber = `BILL-0001`
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

      // Use current number for this bill, then increment
      const currentNumberForBill = sequence.current_number
      const nextNumber = currentNumberForBill + 1
      
      console.log('🔢 Using number', currentNumberForBill, 'for this bill, incrementing sequence to', nextNumber)
      
      // Increment sequence BEFORE creating bill (prevents duplicates)
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

      // Generate document number using the current number
      const paddedNumber = currentNumberForBill.toString().padStart(sequence.padding_zeros || 4, '0')
      documentNumber = `${sequence.prefix || ''}${paddedNumber}${sequence.suffix || ''}`
      
      console.log('✅ Generated bill number:', documentNumber)
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
    // Rollback: decrement the sequence
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

  // ✅ STEP 3: Calculate totals (with proper number parsing to prevent quantity bug)
  let subtotal = 0
  let totalTax = 0
  let cgstAmount = 0
  let sgstAmount = 0
  let igstAmount = 0

  const processedItems = []

  for (const item of items) {
    // ✅ CRITICAL: Parse as Number to prevent string concatenation
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
      quantity: quantity, // Pure number
      unit_id: item.unit_id || null,
      unit_name: item.unit_name || null,
      rate: rate, // Pure number
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
    
    console.log(`📦 Item: ${item.item_name}, Qty: ${quantity}, Rate: ₹${rate}, Total: ₹${totalAmount}`)
  }

  // ✅ Calculate bill-level discount
  const beforeDiscount = subtotal + totalTax
  const billDiscountPercentage = Number(parseFloat(discount_percentage) || 0)
  const billDiscountAmount = Number(parseFloat(discount_amount) || 0)
  
  let finalDiscountAmount = 0
  if (billDiscountPercentage > 0) {
    finalDiscountAmount = (beforeDiscount * billDiscountPercentage) / 100
  } else if (billDiscountAmount > 0) {
    finalDiscountAmount = billDiscountAmount
  }

  const totalAmount = beforeDiscount - finalDiscountAmount

  // ✅ STEP 4: Prepare bill data
  const billData = {
    company_id,
    document_type: 'bill',
    document_number: documentNumber,
    document_date: document_date || new Date().toISOString().split('T')[0],
    due_date: due_date || null,
    vendor_id,
    vendor_name: vendor.vendor_name,
    vendor_gstin: vendor.gstin || null,
    vendor_invoice_number: vendor_invoice_number || null,
    parent_document_id: purchase_order_id || null,
    billing_address: billing_address || vendor.billing_address || {},
    shipping_address: shipping_address || vendor.shipping_address || {},
    subtotal,
    discount_amount: finalDiscountAmount,      // ✅ Use calculated discount
    discount_percentage: billDiscountPercentage, // ✅ Use parsed percentage
    tax_amount: totalTax,
    total_amount: totalAmount,
    paid_amount: 0,
    balance_amount: totalAmount,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    cess_amount: 0,
    status,
    payment_status: 'unpaid',
    notes: notes || null,
    terms_conditions: terms_conditions || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  console.log('💾 Creating bill with number:', documentNumber)

  // ✅ STEP 5: Insert bill
  const { data: bill, error: billError } = await supabaseAdmin
    .from('purchase_documents')
    .insert(billData)
    .select()
    .single()

  if (billError) {
    console.error('❌ Error creating bill:', billError)
    
    // Rollback: decrement the sequence
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
      error: 'Failed to create bill',
      details: process.env.NODE_ENV === 'development' ? billError.message : undefined
    })
  }

  console.log('✅ Bill created successfully with ID:', bill.id)

  // ✅ STEP 6: Insert bill items
  const itemsToInsert = processedItems.map(item => ({
    ...item,
    document_id: bill.id
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('purchase_document_items')
    .insert(itemsToInsert)

  if (itemsError) {
    console.error('❌ Error creating bill items:', itemsError)
    
    // Rollback: delete the bill and decrement sequence
    await supabaseAdmin
      .from('purchase_documents')
      .delete()
      .eq('id', bill.id)
    
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
      error: 'Failed to create bill items'
    })
  }

  console.log('✅ Bill items created successfully')

  // ✅ STEP 7: Create inventory movements and update purchase price
  // NOTE: Stock (current_stock) is updated by DATABASE TRIGGER automatically
  // We only insert inventory_movements and update purchase_price manually
  
  console.log('📦 Creating inventory movements and updating purchase prices...')
  
  for (let i = 0; i < processedItems.length; i++) {
    const item = processedItems[i]
    
    try {
      console.log(`[${i + 1}/${processedItems.length}] Processing: ${item.item_name}, Qty: ${item.quantity}`)
      
      // ✅ Insert inventory movement - Trigger will update items.current_stock automatically
      const { error: movementError } = await supabaseAdmin
        .from('inventory_movements')
        .insert({
          company_id,
          item_id: item.item_id,
          item_code: item.item_code,
          movement_type: 'in', // Purchase = stock IN
          quantity: item.quantity, // Already a pure number
          rate: item.rate,
          value: item.total_amount,
          reference_type: 'bill',
          reference_id: bill.id,
          reference_number: bill.document_number,
          notes: `Purchase Bill #${bill.document_number} from ${vendor.vendor_name}`,
          movement_date: bill.document_date,
          created_at: new Date().toISOString()
          // stock_before and stock_after are set by trigger automatically
        })

      if (movementError) {
        console.error(`   ❌ Movement insert failed:`, movementError)
      } else {
        console.log(`   ✅ Movement created (trigger updates stock automatically)`)
      }

      // ✅ Update purchase price (API handles this, not the trigger)
      const { error: priceError } = await supabaseAdmin
        .from('items')
        .update({
          purchase_price: item.rate,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.item_id)

      if (priceError) {
        console.error(`   ⚠️ Failed to update purchase price:`, priceError)
      } else {
        console.log(`   ✅ Purchase price updated to ₹${item.rate}`)
      }

    } catch (error) {
      console.error(`❌ Error processing ${item.item_name}:`, error)
    }
  }

  console.log('✅ Inventory movements created and purchase prices updated')

  // ✅ STEP 8: Update vendor balance
  try {
    const { data: vendorData } = await supabaseAdmin
      .from('vendors')
      .select('current_balance')
      .eq('id', vendor_id)
      .single()

    if (vendorData) {
      const currentBalance = Number(parseFloat(vendorData.current_balance) || 0)
      const newBalance = currentBalance + totalAmount
      
      await supabaseAdmin
        .from('vendors')
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendor_id)
      
      console.log('✅ Vendor balance updated:', currentBalance, '→', newBalance)
    }
  } catch (error) {
    console.error('❌ Error updating vendor balance:', error)
  }

  // ✅ STEP 9: Fetch complete bill with all relationships
  const { data: completeBill } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*)
    `)
    .eq('id', bill.id)
    .single()

  console.log('🎉 Bill creation completed successfully!')
  console.log('📊 Summary:')
  console.log(`   Bill Number: ${documentNumber}`)
  console.log(`   Total Amount: ₹${totalAmount}`)
  console.log(`   Items: ${processedItems.length}`)

  return res.status(201).json({
    success: true,
    message: 'Bill created successfully',
    data: completeBill
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