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
        vendor:vendors(vendor_name, vendor_code, gstin, advance_amount),
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
  const { 
    company_id, 
    vendor_id, 
    payment_date, 
    payment_method, 
    bank_account_id, 
    reference_number, 
    notes, 
    bill_payments,
    amount, // ✅ For advance payments
    adjust_advance = true // ✅ NEW: Whether to use vendor advance
  } = req.body;

  if (!company_id || !vendor_id || !payment_date) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields' 
    });
  }

  try {
    // ✅ STEP 1: Get vendor details including advance
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('vendor_name, advance_amount')
      .eq('id', vendor_id)
      .single();

    if (vendorError) throw vendorError;

    const vendorAdvance = parseFloat(vendor.advance_amount || 0);
    console.log(`💰 Vendor Advance Available: ₹${vendorAdvance}`);

    // ✅ STEP 2: Determine payment type and calculate amounts
    let totalPaymentRequired = 0;
    let advanceToAdjust = 0;
    let cashPaymentNeeded = 0;
    let isAdvancePayment = false;

    if (!bill_payments || bill_payments.length === 0) {
      // 🔥 ADVANCE PAYMENT (no bills)
      isAdvancePayment = true;
      totalPaymentRequired = parseFloat(amount || 0);
      cashPaymentNeeded = totalPaymentRequired;
      
      if (totalPaymentRequired <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Advance payment amount must be greater than 0'
        });
      }
      
      console.log(`✅ Advance Payment Mode: ₹${totalPaymentRequired}`);
    } else {
      // 🔥 PAYMENT AGAINST BILLS
      totalPaymentRequired = bill_payments.reduce((sum, bp) => sum + parseFloat(bp.payment_amount || 0), 0);
      
      if (totalPaymentRequired <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Total payment amount must be greater than 0'
        });
      }

      // ✅ Calculate advance adjustment if available and enabled
      if (adjust_advance && vendorAdvance > 0) {
        advanceToAdjust = Math.min(vendorAdvance, totalPaymentRequired);
        cashPaymentNeeded = totalPaymentRequired - advanceToAdjust;
        console.log(`💳 Using Advance: ₹${advanceToAdjust}, Cash Needed: ₹${cashPaymentNeeded}`);
      } else {
        cashPaymentNeeded = totalPaymentRequired;
        console.log(`💵 No advance used, Full Cash Payment: ₹${cashPaymentNeeded}`);
      }
    }

    // ✅ STEP 3: Generate payment number
    const { data: paymentNumberData, error: numberError } = await supabaseAdmin.rpc('get_next_document_number', {
      p_company_id: company_id,
      p_document_type: 'payment_made'
    });

    if (numberError) throw numberError;
    const payment_number = paymentNumberData;

    // ✅ STEP 4: Create vendor payment record
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
        amount: totalPaymentRequired,
        notes: notes || null
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // ✅ STEP 5: Process bill payments (if not advance)
    if (!isAdvancePayment && bill_payments.length > 0) {
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
      if (billPaymentRecords.length > 0) {
        const { error: billPaymentsError } = await supabaseAdmin
          .from('bill_payments')
          .insert(billPaymentRecords);

        if (billPaymentsError) throw billPaymentsError;
      }
    }

    // ✅ STEP 6: Update vendor balance
    const { error: vendorUpdateError } = await supabaseAdmin.rpc('update_vendor_balance', {
      p_vendor_id: vendor_id,
      p_amount: -totalPaymentRequired
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
            current_balance: parseFloat(currentVendor.current_balance || 0) - totalPaymentRequired 
          })
          .eq('id', vendor_id);
      }
    }

    // ✅ STEP 7: Handle advance adjustment
    if (advanceToAdjust > 0) {
      // Create advance adjustment record
      const { error: advanceAdjustError } = await supabaseAdmin
        .from('vendor_advances')
        .insert({
          company_id,
          vendor_id,
          advance_type: 'adjusted',
          amount: advanceToAdjust,
          source_type: 'payment',
          source_id: payment.id,
          source_number: payment.payment_number,
          adjusted_against_type: 'payment',
          adjusted_against_id: payment.id,
          adjusted_against_number: payment.payment_number,
          notes: `Advance adjusted against payment #${payment.payment_number} - ${bill_payments.length} bill(s)`,
          created_at: new Date().toISOString()
        });

      if (advanceAdjustError) {
        console.error('❌ Failed to create advance adjustment record:', advanceAdjustError);
      }

      // Update vendor advance balance
      const { error: vendorAdvanceError } = await supabaseAdmin
        .from('vendors')
        .update({
          advance_amount: vendorAdvance - advanceToAdjust,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendor_id);

      if (vendorAdvanceError) {
        console.error('❌ Failed to update vendor advance:', vendorAdvanceError);
      } else {
        console.log(`✅ Vendor advance reduced: ₹${vendorAdvance} → ₹${vendorAdvance - advanceToAdjust}`);
      }
    }

    // ✅ STEP 8: Handle pure advance payment
    if (isAdvancePayment) {
      // Create advance creation record
      const { error: advanceCreateError } = await supabaseAdmin
        .from('vendor_advances')
        .insert({
          company_id,
          vendor_id,
          advance_type: 'created',
          amount: totalPaymentRequired,
          source_type: 'payment',
          source_id: payment.id,
          source_number: payment.payment_number,
          notes: `Advance payment #${payment.payment_number}`,
          created_at: new Date().toISOString()
        });

      if (advanceCreateError) {
        console.error('❌ Failed to create advance record:', advanceCreateError);
      }

      // Increase vendor advance balance
      const { error: vendorAdvanceError } = await supabaseAdmin
        .from('vendors')
        .update({
          advance_amount: vendorAdvance + totalPaymentRequired,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendor_id);

      if (vendorAdvanceError) {
        console.error('❌ Failed to update vendor advance:', vendorAdvanceError);
      } else {
        console.log(`✅ Vendor advance increased: ₹${vendorAdvance} → ₹${vendorAdvance + totalPaymentRequired}`);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
      advance_adjusted: advanceToAdjust,
      cash_payment: cashPaymentNeeded,
      is_advance_payment: isAdvancePayment
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