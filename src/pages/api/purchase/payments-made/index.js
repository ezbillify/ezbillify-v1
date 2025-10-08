// pages/api/purchase/payments-made/index.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getPayments(req, res)
      case 'POST':
        return await createPayment(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Payment Made API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getPayments(req, res) {
  const {
    company_id,
    vendor_id,
    payment_method,
    from_date,
    to_date,
    search,
    page = 1,
    limit = 50,
    sort_by = 'payment_date',
    sort_order = 'desc'
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  let query = supabaseAdmin
    .from('vendor_payments')
    .select('*, vendor:vendors(vendor_name, vendor_code)', { count: 'exact' })
    .eq('company_id', company_id)

  if (vendor_id) query = query.eq('vendor_id', vendor_id)
  if (payment_method) query = query.eq('payment_method', payment_method)
  if (from_date) query = query.gte('payment_date', from_date)
  if (to_date) query = query.lte('payment_date', to_date)

  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      payment_number.ilike.%${searchTerm}%,
      vendor_name.ilike.%${searchTerm}%,
      reference_number.ilike.%${searchTerm}%
    `)
  }

  const allowedSortFields = ['payment_date', 'payment_number', 'vendor_name', 'amount', 'created_at']
  const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'payment_date'
  query = query.order(sortField, { ascending: sort_order === 'asc' })

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum
  query = query.range(offset, offset + limitNum - 1)

  const { data: payments, error, count } = await query

  if (error) {
    console.error('Error fetching payments:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payments'
    })
  }

  // Get bill payments count for each payment
  const paymentsWithCount = await Promise.all(
    payments.map(async (payment) => {
      const { count: billCount } = await supabaseAdmin
        .from('bill_payments')
        .select('*', { count: 'exact', head: true })
        .eq('payment_id', payment.id)

      return {
        ...payment,
        bill_payments_count: billCount || 0
      }
    })
  )

  const totalPages = Math.ceil(count / limitNum)

  return res.status(200).json({
    success: true,
    data: paymentsWithCount,
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

async function createPayment(req, res) {
  const {
    company_id,
    vendor_id,
    payment_date,
    payment_method,
    bank_account_id,
    reference_number,
    bill_payments,
    notes
  } = req.body

  if (!company_id || !vendor_id || !bill_payments || bill_payments.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, vendor ID, and bill payments are required'
    })
  }

  // Calculate total amount
  const totalAmount = bill_payments.reduce((sum, bp) => sum + parseFloat(bp.payment_amount || 0), 0)

  if (totalAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Payment amount must be greater than 0'
    })
  }

  // ✅ STEP 1: Generate payment number
  let paymentNumber = null
  let sequenceId = null
  
  try {
    const currentFY = getCurrentFinancialYear()
    
    const { data: sequence, error: seqError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('document_type', 'payment_made')
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
      paymentNumber = `PM-0001`
    } else {
      sequenceId = sequence.id
      
      if (sequence.reset_yearly && sequence.financial_year !== currentFY) {
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

      const currentNumberForPayment = sequence.current_number
      const nextNumber = currentNumberForPayment + 1
      
      const { error: incrementError } = await supabaseAdmin
        .from('document_sequences')
        .update({ 
          current_number: nextNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequenceId)
      
      if (incrementError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate payment number'
        })
      }

      const paddedNumber = currentNumberForPayment.toString().padStart(sequence.padding_zeros || 4, '0')
      paymentNumber = `${sequence.prefix || ''}${paddedNumber}${sequence.suffix || ''}`
    }
  } catch (error) {
    console.error('❌ Error generating payment number:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate payment number'
    })
  }

  // ✅ STEP 2: Fetch vendor details
  const { data: vendor, error: vendorError } = await supabaseAdmin
    .from('vendors')
    .select('vendor_name, current_balance')
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

  // ✅ STEP 3: Validate bills
  for (const bp of bill_payments) {
    const { data: bill } = await supabaseAdmin
      .from('purchase_documents')
      .select('balance_amount')
      .eq('id', bp.bill_id)
      .single()

    if (!bill) {
      return res.status(400).json({
        success: false,
        error: `Bill ${bp.bill_number} not found`
      })
    }

    if (parseFloat(bp.payment_amount) > parseFloat(bill.balance_amount)) {
      return res.status(400).json({
        success: false,
        error: `Payment amount exceeds balance for bill ${bp.bill_number}`
      })
    }
  }

  // ✅ STEP 4: Create payment record
  const paymentData = {
    company_id,
    payment_number: paymentNumber,
    payment_date: payment_date || new Date().toISOString().split('T')[0],
    vendor_id,
    vendor_name: vendor.vendor_name,
    payment_method: payment_method || 'bank_transfer',
    bank_account_id: bank_account_id || null,
    reference_number: reference_number || null,
    amount: totalAmount,
    notes: notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('vendor_payments')
    .insert(paymentData)
    .select()
    .single()

  if (paymentError) {
    console.error('❌ Error creating payment:', paymentError)
    
    if (sequenceId) {
      await supabaseAdmin
        .from('document_sequences')
        .update({ current_number: supabaseAdmin.raw('current_number - 1') })
        .eq('id', sequenceId)
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create payment'
    })
  }

  // ✅ STEP 5: Create bill payment allocations and update bills
  const billPaymentRecords = []
  
  for (const bp of bill_payments) {
    billPaymentRecords.push({
      payment_id: payment.id,
      bill_id: bp.bill_id,
      bill_number: bp.bill_number,
      payment_amount: parseFloat(bp.payment_amount)
    })

    // Update bill amounts
    const { data: bill } = await supabaseAdmin
      .from('purchase_documents')
      .select('paid_amount, balance_amount, total_amount')
      .eq('id', bp.bill_id)
      .single()

    if (bill) {
      const newPaidAmount = parseFloat(bill.paid_amount || 0) + parseFloat(bp.payment_amount)
      const newBalanceAmount = parseFloat(bill.total_amount) - newPaidAmount
      
      let paymentStatus = 'unpaid'
      if (newBalanceAmount <= 0) {
        paymentStatus = 'paid'
      } else if (newPaidAmount > 0) {
        paymentStatus = 'partially_paid'
      }

      await supabaseAdmin
        .from('purchase_documents')
        .update({
          paid_amount: newPaidAmount,
          balance_amount: Math.max(0, newBalanceAmount),
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bp.bill_id)
    }
  }

  const { error: billPaymentsError } = await supabaseAdmin
    .from('bill_payments')
    .insert(billPaymentRecords)

  if (billPaymentsError) {
    console.error('❌ Error creating bill payments:', billPaymentsError)
    
    // Rollback payment
    await supabaseAdmin
      .from('vendor_payments')
      .delete()
      .eq('id', payment.id)
    
    if (sequenceId) {
      await supabaseAdmin
        .from('document_sequences')
        .update({ current_number: supabaseAdmin.raw('current_number - 1') })
        .eq('id', sequenceId)
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create bill payment allocations'
    })
  }

  // ✅ STEP 6: Update vendor balance
  const newVendorBalance = parseFloat(vendor.current_balance || 0) - totalAmount

  await supabaseAdmin
    .from('vendors')
    .update({
      current_balance: newVendorBalance,
      updated_at: new Date().toISOString()
    })
    .eq('id', vendor_id)

  // ✅ STEP 7: Fetch complete payment
  const { data: completePayment } = await supabaseAdmin
    .from('vendor_payments')
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone),
      bill_payments(*)
    `)
    .eq('id', payment.id)
    .single()

  console.log('🎉 Payment recorded successfully!')
  console.log(`   Payment Number: ${paymentNumber}`)
  console.log(`   Amount: ₹${totalAmount}`)
  console.log(`   Bills: ${bill_payments.length}`)

  return res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    data: completePayment
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