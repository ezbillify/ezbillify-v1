// pages/api/purchase/payments-made/index.js
import { supabaseAdmin } from '../../../../services/utils/supabase';
import { withAuth } from '../../../../lib/middleware';

async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    return handleGet(req, res);
  } else if (method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function handleGet(req, res) {
  const { 
    company_id, 
    search = '', 
    payment_method = '',
    from_date = '',
    to_date = '',
    page = 1, 
    limit = 20,
    sort_by = 'payment_date',
    sort_order = 'desc'
  } = req.query;

  if (!company_id) {
    return res.status(400).json({ success: false, error: 'Company ID is required' });
  }

  try {
    let query = supabaseAdmin
      .from('vendor_payments')
      .select(`
        *,
        vendor:vendors(vendor_name, vendor_code, gstin),
        bank_account:bank_accounts(account_name, bank_name, account_number),
        bill_payments(id, bill_number, payment_amount)
      `, { count: 'exact' })
      .eq('company_id', company_id);

    // Search filter
    if (search) {
      query = query.or(`payment_number.ilike.%${search}%,vendor_name.ilike.%${search}%,reference_number.ilike.%${search}%`);
    }

    // Payment method filter
    if (payment_method) {
      query = query.eq('payment_method', payment_method);
    }

    // Date range filters
    if (from_date) {
      query = query.gte('payment_date', from_date);
    }
    if (to_date) {
      query = query.lte('payment_date', to_date);
    }

    // Sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Add bill count to each payment
    const paymentsWithCount = data.map(payment => ({
      ...payment,
      bill_payments_count: payment.bill_payments?.length || 0
    }));

    return res.status(200).json({
      success: true,
      data: paymentsWithCount,
      pagination: {
        total_records: count,
        current_page: parseInt(page),
        total_pages: Math.ceil(count / parseInt(limit)),
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handlePost(req, res) {
  const { company_id, vendor_id, payment_date, payment_method, bank_account_id, reference_number, notes, bill_payments } = req.body;

  if (!company_id || !vendor_id || !payment_date || !bill_payments || bill_payments.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields' 
    });
  }

  try {
    // Calculate total payment amount
    const totalAmount = bill_payments.reduce((sum, bp) => sum + parseFloat(bp.payment_amount || 0), 0);

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Total payment amount must be greater than 0'
      });
    }

    // Start transaction
    const { data: paymentNumberData, error: numberError } = await supabaseAdmin.rpc('get_next_document_number', {
      p_company_id: company_id,
      p_document_type: 'payment_made'
    });

    if (numberError) throw numberError;

    const payment_number = paymentNumberData;

    // Get vendor details
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('vendor_name')
      .eq('id', vendor_id)
      .single();

    if (vendorError) throw vendorError;

    // Create vendor payment
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('vendor_payments')
      .insert({
        company_id,
        payment_number,
        payment_date,
        vendor_id,
        vendor_name: vendor.vendor_name,
        payment_method,
        bank_account_id: bank_account_id || null,
        reference_number: reference_number || null,
        amount: totalAmount,
        notes: notes || null
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Process each bill payment
    const billPaymentRecords = [];
    for (const bp of bill_payments) {
      const paymentAmount = parseFloat(bp.payment_amount || 0);
      
      if (paymentAmount <= 0) continue;

      // Get bill details
      const { data: bill, error: billError } = await supabaseAdmin
        .from('purchase_documents')
        .select('balance_amount, paid_amount, total_amount')
        .eq('id', bp.bill_id)
        .single();

      if (billError) throw billError;

      // Validate payment amount
      if (paymentAmount > parseFloat(bill.balance_amount)) {
        throw new Error(`Payment amount (${paymentAmount}) exceeds balance (${bill.balance_amount}) for bill ${bp.bill_number}`);
      }

      // Create bill payment record
      billPaymentRecords.push({
        payment_id: payment.id,
        bill_id: bp.bill_id,
        bill_number: bp.bill_number,
        payment_amount: paymentAmount
      });

      // Update bill amounts
      const newPaidAmount = parseFloat(bill.paid_amount || 0) + paymentAmount;
      const newBalanceAmount = parseFloat(bill.total_amount) - newPaidAmount;
      
      let newPaymentStatus = 'unpaid';
      if (newBalanceAmount === 0) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'partially_paid';
      }

      const { error: updateBillError } = await supabaseAdmin
        .from('purchase_documents')
        .update({
          paid_amount: newPaidAmount,
          balance_amount: newBalanceAmount,
          payment_status: newPaymentStatus
        })
        .eq('id', bp.bill_id);

      if (updateBillError) throw updateBillError;
    }

    // Insert all bill payments
    const { error: billPaymentsError } = await supabaseAdmin
      .from('bill_payments')
      .insert(billPaymentRecords);

    if (billPaymentsError) throw billPaymentsError;

    // Update vendor current balance
    const { error: vendorUpdateError } = await supabaseAdmin.rpc('update_vendor_balance', {
      p_vendor_id: vendor_id,
      p_amount: -totalAmount
    });

    if (vendorUpdateError) {
      // Fallback: direct update
      const { data: currentVendor, error: fetchError } = await supabaseAdmin
        .from('vendors')
        .select('current_balance')
        .eq('id', vendor_id)
        .single();

      if (!fetchError) {
        await supabaseAdmin
          .from('vendors')
          .update({ 
            current_balance: parseFloat(currentVendor.current_balance || 0) - totalAmount 
          })
          .eq('id', vendor_id);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to record payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default withAuth(handler);