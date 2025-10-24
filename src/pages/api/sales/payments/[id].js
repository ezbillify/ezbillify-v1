// pages/api/sales/payments/[id].js
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
    .from('payments')
    .select(`
      *,
      customer:customers(id, name, customer_code, email, phone),
      branch:branches(id, name, document_prefix),
      bank_account:bank_accounts(account_name, bank_name, account_number),
      allocations:payment_allocations(
        id,
        allocated_amount,
        document:sales_documents(id, document_number, document_type, document_date, total_amount, paid_amount)
      )
    `)
    .eq('id', paymentId)
    .eq('company_id', company_id)
    .eq('payment_type', 'received')
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

  // Check if payment exists
  const { data: payment, error: fetchError } = await supabaseAdmin
    .from('payments')
    .select('*, allocations:payment_allocations(*)')
    .eq('id', paymentId)
    .eq('company_id', company_id)
    .eq('payment_type', 'received')
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

  // Reverse payment allocations
  if (payment.allocations && payment.allocations.length > 0) {
    for (const allocation of payment.allocations) {
      const { data: invoice } = await supabaseAdmin
        .from('sales_documents')
        .select('paid_amount, total_amount')
        .eq('id', allocation.document_id)
        .single()

      if (invoice) {
        const newPaidAmount = Math.max(0, parseFloat(invoice.paid_amount || 0) - parseFloat(allocation.allocated_amount))
        const newBalanceAmount = parseFloat(invoice.total_amount) - newPaidAmount

        let newPaymentStatus = 'unpaid'
        if (newPaidAmount >= parseFloat(invoice.total_amount)) {
          newPaymentStatus = 'paid'
        } else if (newPaidAmount > 0) {
          newPaymentStatus = 'partial'
        }

        await supabaseAdmin
          .from('sales_documents')
          .update({
            paid_amount: newPaidAmount,
            balance_amount: newBalanceAmount,
            payment_status: newPaymentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', allocation.document_id)
      }
    }
  } else {
    // Was advance payment, reverse customer advance
    const { data: customerData } = await supabaseAdmin
      .from('customers')
      .select('advance_amount')
      .eq('id', payment.customer_id)
      .single()

    const newAdvance = Math.max(0, parseFloat(customerData?.advance_amount || 0) - parseFloat(payment.amount))
    await supabaseAdmin
      .from('customers')
      .update({ advance_amount: newAdvance })
      .eq('id', payment.customer_id)
  }

  // Delete payment (allocations will be deleted by CASCADE)
  const { error: deleteError } = await supabaseAdmin
    .from('payments')
    .delete()
    .eq('id', paymentId)
    .eq('company_id', company_id)

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
