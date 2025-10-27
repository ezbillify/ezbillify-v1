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
      case 'PUT':
        return await updatePayment(req, res, id)
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

async function updatePayment(req, res, paymentId) {
  const {
    company_id,
    customer_id,
    payment_date,
    amount,
    payment_method,
    bank_account_id,
    reference_number,
    notes,
    allocations
  } = req.body

  if (!company_id || !customer_id || !payment_date || !amount) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    })
  }

  try {
    // Fetch existing payment
    const { data: existingPayment, error: fetchError } = await supabaseAdmin
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

    // Reverse previous allocations
    if (existingPayment.allocations && existingPayment.allocations.length > 0) {
      for (const allocation of existingPayment.allocations) {
        const { data: invoice } = await supabaseAdmin
          .from('sales_documents')
          .select('paid_amount, total_amount')
          .eq('id', allocation.sales_document_id)
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
    } else if (existingPayment.amount) {
      // Was advance payment, reverse customer advance
      const { data: customerData } = await supabaseAdmin
        .from('customers')
        .select('advance_amount')
        .eq('id', existingPayment.customer_id)
        .single()

      const newAdvance = Math.max(0, parseFloat(customerData?.advance_amount || 0) - parseFloat(existingPayment.amount))
      await supabaseAdmin
        .from('customers')
        .update({ advance_amount: newAdvance })
        .eq('id', existingPayment.customer_id)
    }

    // Delete existing allocations
    await supabaseAdmin
      .from('payment_allocations')
      .delete()
      .eq('payment_id', paymentId)

    // Fetch customer details if customer changed
    let customerData = null;
    if (customer_id && customer_id !== existingPayment.customer_id) {
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('name')
        .eq('id', customer_id)
        .eq('company_id', company_id)
        .single()

      if (!customerError && customer) {
        customerData = customer;
      }
    }

    // Update payment record
    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        customer_id,
        payment_date,
        amount: parseFloat(amount),
        payment_method: payment_method || 'cash',
        bank_account_id: bank_account_id || null,
        reference_number: reference_number || null,
        notes: notes || null,
        party_name: customerData?.name || existingPayment.party_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating payment:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment'
      })
    }

    // Handle new payment allocations
    if (allocations && allocations.length > 0) {
      const allocationRecords = allocations.map(allocation => ({
        payment_id: paymentId,
        sales_document_id: allocation.document_id,
        allocated_amount: parseFloat(allocation.allocated_amount),
        created_at: new Date().toISOString()
      }))

      const { error: allocError } = await supabaseAdmin
        .from('payment_allocations')
        .insert(allocationRecords)

      if (allocError) {
        console.error('Error creating allocations:', allocError)
      }

      // Update invoice paid amounts and create ledger entries
      for (const allocation of allocations) {
        const { data: invoice } = await supabaseAdmin
          .from('sales_documents')
          .select('paid_amount, total_amount, document_number')
          .eq('id', allocation.sales_document_id)
          .single()

        if (invoice) {
          const newPaidAmount = parseFloat(invoice.paid_amount || 0) + parseFloat(allocation.allocated_amount)
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

          // Create customer ledger entry for this allocation
          // Get the latest customer ledger balance for proper balance tracking
          const { data: latestLedger } = await supabaseAdmin
            .from('customer_ledger_entries')
            .select('balance')
            .eq('customer_id', customer_id)
            .eq('company_id', company_id)
            .order('entry_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const previousBalance = parseFloat(latestLedger?.balance || 0);
          const allocatedAmount = parseFloat(allocation.allocated_amount);
          // Payment reduces the balance (credit transaction)
          const newBalance = previousBalance - allocatedAmount;

          await supabaseAdmin
            .from('customer_ledger_entries')
            .insert({
              company_id,
              customer_id,
              entry_date: payment_date,
              entry_type: 'payment_allocation',
              reference_type: 'payment',
              reference_id: paymentId,
              reference_number: updatedPayment.payment_number,
              debit_amount: 0,
              credit_amount: allocatedAmount,
              balance: newBalance,
              description: `Payment allocated to invoice ${invoice.document_number}`,
              created_at: new Date().toISOString()
            });
        }
      }
    } else {
      // New advance payment - create customer ledger entry
      // Get the latest customer ledger balance for proper balance tracking
      const { data: latestLedger } = await supabaseAdmin
        .from('customer_ledger_entries')
        .select('balance')
        .eq('customer_id', customer_id)
        .eq('company_id', company_id)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const previousBalance = parseFloat(latestLedger?.balance || 0);
      const paymentAmount = parseFloat(amount);
      // Advance payment reduces the balance (credit transaction)
      const newBalance = previousBalance - paymentAmount;

      await supabaseAdmin
        .from('customer_ledger_entries')
        .insert({
          company_id,
          customer_id,
          entry_date: payment_date,
          entry_type: 'advance_payment',
          reference_type: 'payment',
          reference_id: paymentId,
          reference_number: updatedPayment.payment_number,
          debit_amount: 0,
          credit_amount: paymentAmount,
          balance: newBalance,
          description: notes || 'Advance payment received',
          created_at: new Date().toISOString()
        })

      // Update customer advance amount
      const { data: customerData } = await supabaseAdmin
        .from('customers')
        .select('advance_amount')
        .eq('id', customer_id)
        .single()

      const newAdvance = parseFloat(customerData?.advance_amount || 0) + parseFloat(amount)
      await supabaseAdmin
        .from('customers')
        .update({ advance_amount: newAdvance })
        .eq('id', customer_id)
    }

    return res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: updatedPayment
    })

  } catch (error) {
    console.error('Error updating payment:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
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
        .eq('id', allocation.sales_document_id)
        .single()

      if (invoice) {
        const newPaidAmount = Math.max(0, parseFloat(invoice.paid_amount || 0) - parseFloat(allocation.payment_amount || allocation.allocated_amount))
        const newBalanceAmount = parseFloat(invoice.total_amount) - newPaidAmount

        let newPaymentStatus = 'unpaid'
        if (newBalanceAmount === 0) {
          newPaymentStatus = 'paid'
        } else if (newPaidAmount > 0) {
          newPaymentStatus = 'partial'
        }

        const { error: updateError } = await supabaseAdmin
          .from('sales_documents')
          .update({
            paid_amount: newPaidAmount,
            balance_amount: newBalanceAmount,
            payment_status: newPaymentStatus
          })
          .eq('id', allocation.sales_document_id)

        if (updateError) throw updateError;
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

  // Delete customer ledger entries for this payment
  await supabaseAdmin
    .from('customer_ledger_entries')
    .delete()
    .eq('reference_id', paymentId)
    .eq('reference_type', 'payment')
    .eq('company_id', company_id)

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