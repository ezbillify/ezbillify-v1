// pages/api/sales/payments/index.js - Payment Received API with branch support
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
    console.error('Payment API error:', error)
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
    branch_id,
    customer_id,
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
    .from('payments')
    .select(`
      *,
      customer:customers(id, name, customer_code, email, phone),
      branch:branches(id, name, document_prefix),
      bank_account:bank_accounts(account_name, bank_name),
      allocations:payment_allocations(
        id,
        allocated_amount,
        document:sales_documents(id, document_number, document_type, total_amount)
      )
    `, { count: 'exact' })
    .eq('company_id', company_id)
    .eq('payment_type', 'received')

  if (branch_id) {
    query = query.eq('branch_id', branch_id)
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id)
  }

  if (payment_method) {
    query = query.eq('payment_method', payment_method)
  }

  if (from_date) {
    query = query.gte('payment_date', from_date)
  }

  if (to_date) {
    query = query.lte('payment_date', to_date)
  }

  if (search) {
    query = query.or(`payment_number.ilike.%${search}%,party_name.ilike.%${search}%,reference_number.ilike.%${search}%`)
  }

  query = query.order(sort_by, { ascending: sort_order === 'asc' })

  const offset = (parseInt(page) - 1) * parseInt(limit)
  query = query.range(offset, offset + parseInt(limit) - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching payments:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payments'
    })
  }

  return res.status(200).json({
    success: true,
    data: data || [],
    pagination: {
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil((count || 0) / parseInt(limit))
    }
  })
}

async function createPayment(req, res) {
  const {
    company_id,
    branch_id,
    customer_id,
    payment_date,
    amount,
    payment_method,
    bank_account_id,
    reference_number,
    notes,
    allocations,
    adjust_advance = true
  } = req.body

  console.log('📥 Creating payment with data:', {
    company_id,
    branch_id,
    customer_id,
    payment_date,
    amount,
    allocations: allocations?.length
  });

  if (!company_id || !customer_id || !payment_date || !amount) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: company_id, customer_id, payment_date, and amount are required'
    })
  }

  // Branch ID is optional - if not provided, we'll use a default or skip branch-specific logic
  if (!branch_id) {
    console.log('⚠️ Warning: No branch_id provided, attempting to get default branch');
  }

  try {
    // Fetch branch details - if no branch_id provided, try to get default branch
    let branch = null;
    let effectiveBranchId = branch_id;

    if (!branch_id) {
      // Try to get the first active branch for the company
      const { data: defaultBranch } = await supabaseAdmin
        .from('branches')
        .select('id, document_prefix, name')
        .eq('company_id', company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (defaultBranch) {
        branch = defaultBranch;
        effectiveBranchId = defaultBranch.id;
        console.log('✅ Using default branch:', defaultBranch.name);
      }
    } else {
      const { data: branchData, error: branchError } = await supabaseAdmin
        .from('branches')
        .select('id, document_prefix, name')
        .eq('id', branch_id)
        .eq('company_id', company_id)
        .single();

      if (branchError || !branchData) {
        return res.status(400).json({
          success: false,
          error: 'Branch not found'
        });
      }

      branch = branchData;
      effectiveBranchId = branchData.id;
    }

    // If still no branch, we can't proceed with document numbering
    if (!branch || !effectiveBranchId) {
      return res.status(400).json({
        success: false,
        error: 'No branch found. Please select a branch or create one.'
      });
    }

    const branchPrefix = branch.document_prefix || 'BR';
    console.log('🏢 Using branch:', branch.name, 'with prefix:', branchPrefix);

    // Fetch customer details
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('name, customer_code')
      .eq('id', customer_id)
      .eq('company_id', company_id)
      .single()

    if (customerError || !customer) {
      return res.status(400).json({
        success: false,
        error: 'Customer not found'
      })
    }

    // Get financial year
    const paymentDate = new Date(payment_date)
    const currentMonth = paymentDate.getMonth()
    const currentYear = paymentDate.getFullYear()
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1
    const fyEndYear = fyStartYear + 1
    const currentFY = `${fyStartYear}-${fyEndYear.toString().padStart(4, '0')}`

    // Fetch document sequence
    const { data: sequence, error: sequenceError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('branch_id', effectiveBranchId)
      .eq('document_type', 'payment_received')
      .eq('is_active', true)
      .maybeSingle()

    let currentNumberForPayment
    let paymentNumber

    if (!sequence) {
      const { data: newSequence, error: createSeqError } = await supabaseAdmin
        .from('document_sequences')
        .insert({
          company_id,
          branch_id: effectiveBranchId,
          document_type: 'payment_received',
          prefix: 'PR-',
          current_number: 1,
          padding_zeros: 4,
          financial_year: currentFY,
          reset_frequency: 'yearly',
          is_active: true
        })
        .select()
        .single()

      if (createSeqError) {
        console.error('Error creating sequence:', createSeqError)
        return res.status(500).json({
          success: false,
          error: 'Failed to create document sequence'
        })
      }

      currentNumberForPayment = 1
      const paddedNumber = currentNumberForPayment.toString().padStart(4, '0')
      paymentNumber = `${branchPrefix}-PR-${paddedNumber}/${currentFY.substring(2)}`
    } else {
      if (sequence.financial_year !== currentFY && sequence.reset_frequency === 'yearly') {
        const { error: resetError } = await supabaseAdmin
          .from('document_sequences')
          .update({
            current_number: 1,
            financial_year: currentFY,
            updated_at: new Date().toISOString()
          })
          .eq('id', sequence.id)

        if (resetError) {
          console.error('Error resetting sequence:', resetError)
          return res.status(500).json({
            success: false,
            error: 'Failed to reset sequence'
          })
        }

        currentNumberForPayment = 1
      } else {
        currentNumberForPayment = sequence.current_number
      }

      const paddedNumber = currentNumberForPayment.toString().padStart(sequence.padding_zeros || 4, '0')
      paymentNumber = `${branchPrefix}-${sequence.prefix || ''}${paddedNumber}/${currentFY.substring(2)}`
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        company_id,
        branch_id: effectiveBranchId,
        payment_type: 'received',
        payment_number: paymentNumber,
        payment_date,
        customer_id,
        party_name: customer.name,
        amount: parseFloat(amount),
        payment_method: payment_method || 'cash',
        bank_account_id: bank_account_id || null,
        reference_number: reference_number || null,
        notes: notes || null,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment'
      })
    }

    // Handle payment allocations
    if (allocations && allocations.length > 0) {
      const allocationRecords = allocations.map(allocation => ({
        payment_id: payment.id,
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

      // Update invoice paid amounts and create ledger entries for each allocation
      for (const allocation of allocations) {
        const { data: invoice } = await supabaseAdmin
          .from('sales_documents')
          .select('paid_amount, total_amount, document_number')
          .eq('id', allocation.document_id)
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
        }
      }

      // Create a single ledger entry for the full payment
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
      // For customer ledger: Debit = money customer owes us, Credit = money we received from customer
      // When customer pays, it's a credit transaction that reduces what they owe us
      const newBalance = previousBalance - paymentAmount; // Payment reduces the balance (credit transaction)

      await supabaseAdmin
        .from('customer_ledger_entries')
        .insert({
          company_id,
          customer_id,
          entry_date: payment_date,
          entry_type: 'payment',
          reference_type: 'payment',
          reference_id: payment.id,
          reference_number: paymentNumber,
          debit_amount: 0,
          credit_amount: paymentAmount,
          balance: newBalance,
          description: `Payment received - ${paymentNumber} (Allocated to ${allocations.length} invoice${allocations.length > 1 ? 's' : ''})`,
          created_at: new Date().toISOString()
        });

      console.log('✅ Ledger entry created for payment:', {
        paymentNumber,
        amount: paymentAmount,
        previousBalance,
        newBalance,
        allocations: allocations.length
      });
    } else {
      // Advance payment - create customer ledger entry with balance
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
          reference_id: payment.id,
          reference_number: paymentNumber,
          debit_amount: 0,
          credit_amount: paymentAmount,
          balance: newBalance,
          description: notes || `Advance payment received - ${paymentNumber}`,
          created_at: new Date().toISOString()
        });

      console.log('✅ Ledger entry created for advance payment:', {
        paymentNumber,
        amount: paymentAmount,
        previousBalance,
        newBalance
      });

      // Update customer advance amount (optional tracking)
      const { data: customerData } = await supabaseAdmin
        .from('customers')
        .select('advance_amount')
        .eq('id', customer_id)
        .single();

      const newAdvance = parseFloat(customerData?.advance_amount || 0) + parseFloat(amount);
      await supabaseAdmin
        .from('customers')
        .update({ advance_amount: newAdvance })
        .eq('id', customer_id);
    }

    // Increment sequence number
    const nextNumber = currentNumberForPayment + 1
    const { error: updateSeqError } = await supabaseAdmin
      .from('document_sequences')
      .update({
        current_number: nextNumber,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', company_id)
      .eq('branch_id', effectiveBranchId)
      .eq('document_type', 'payment_received')
      .eq('current_number', currentNumberForPayment)

    if (updateSeqError) {
      console.error('Warning: Failed to update sequence number:', updateSeqError)
    }

    return res.status(201).json({
      success: true,
      message: 'Payment received successfully',
      data: payment
    })

  } catch (error) {
    console.error('Error creating payment:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)
