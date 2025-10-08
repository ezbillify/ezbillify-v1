// pages/api/purchase/payments-made/[id].js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Payment ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getPayment(req, res, id)
      case 'DELETE':
        return await deletePayment(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Payment API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getPayment(req, res, paymentId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const { data: payment, error } = await supabaseAdmin
    .from('vendor_payments')
    .select(`
      *,
      vendor:vendors(id, vendor_name, vendor_code, email, phone, current_balance),
      bill_payments(*)
    `)
    .eq('id', paymentId)
    .eq('company_id', company_id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      })
    }

    console.error('Error fetching payment:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payment'
    })
  }

  return res.status(200).json({
    success: true,
    data: payment
  })
}

async function deletePayment(req, res, paymentId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Fetch payment details
  const { data: payment, error: fetchError } = await supabaseAdmin
    .from('vendor_payments')
    .select('*, bill_payments(*)')
    .eq('id', paymentId)
    .eq('company_id', company_id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payment'
    })
  }

  // Reverse bill payments
  for (const bp of payment.bill_payments || []) {
    const { data: bill } = await supabaseAdmin
      .from('purchase_documents')
      .select('paid_amount, balance_amount, total_amount')
      .eq('id', bp.bill_id)
      .single()

    if (bill) {
      const newPaidAmount = parseFloat(bill.paid_amount || 0) - parseFloat(bp.payment_amount)
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
          paid_amount: Math.max(0, newPaidAmount),
          balance_amount: newBalanceAmount,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bp.bill_id)
    }
  }

  // Update vendor balance
  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('current_balance')
    .eq('id', payment.vendor_id)
    .single()

  if (vendor) {
    await supabaseAdmin
      .from('vendors')
      .update({
        current_balance: parseFloat(vendor.current_balance || 0) + parseFloat(payment.amount),
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.vendor_id)
  }

  // Delete payment (bill_payments will be deleted by CASCADE)
  const { error: deleteError } = await supabaseAdmin
    .from('vendor_payments')
    .delete()
    .eq('id', paymentId)

  if (deleteError) {
    console.error('Error deleting payment:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete payment'
    })
  }

  return res.status(200).json({
    success: true,
    message: `Payment ${payment.payment_number} deleted successfully`
  })
}

export default withAuth(handler)