// pages/api/purchase/payments-made/index.js - UPDATED: Branch-based document numbering
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
    branch_id,
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

    // 🔥 NEW: Filter by branch if provided
    if (branch_id) {
      query = query.eq('branch_id', branch_id)
    }

    if (search) {
      query = query.or(`payment_number.ilike.%${search}%,vendor_name.ilike.%${search}%,reference_number.ilike.%${search}%`);
    }

    if (payment_method) {
      query = query.eq('payment_method', payment_method);
    }

    if (from_date) {
      query = query.gte('payment_date', from_date);
    }
    if (to_date) {
      query = query.lte('payment_date', to_date);
    }

    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

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
    branch_id,
    vendor_id, 
    payment_date, 
    payment_method, 
    bank_account_id, 
    reference_number, 
    notes, 
    bill_payments,
    amount,
    adjust_advance = true
  } = req.body;

  if (!company_id || !branch_id || !vendor_id || !payment_date) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields (company_id, branch_id, vendor_id, payment_date)' 
    });
  }

  try {
    // STEP 1: Get vendor details
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('vendor_name, advance_amount')
      .eq('id', vendor_id)
      .single();

    if (vendorError) throw vendorError;

    const vendorAdvance = parseFloat(vendor.advance_amount || 0);
    console.log(`💰 Vendor Advance Available: ₹${vendorAdvance}`);

    // STEP 2: Determine payment type and calculate amounts
    let totalPaymentRequired = 0;
    let advanceToAdjust = 0;
    let cashPaymentNeeded = 0;
    let isAdvancePayment = false;

    if (!bill_payments || bill_payments.length === 0) {
      // Advance payment (no bills)
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
      // Payment against bills
      totalPaymentRequired = bill_payments.reduce((sum, bp) => sum + parseFloat(bp.payment_amount || 0), 0);
      
      if (totalPaymentRequired <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Total payment amount must be greater than 0'
        });
      }

      // Calculate advance adjustment if available and enabled
      if (adjust_advance && vendorAdvance > 0) {
        advanceToAdjust = Math.min(vendorAdvance, totalPaymentRequired);
        cashPaymentNeeded = totalPaymentRequired - advanceToAdjust;
        console.log(`💳 Using Advance: ₹${advanceToAdjust}, Cash Needed: ₹${cashPaymentNeeded}`);
      } else {
        cashPaymentNeeded = totalPaymentRequired;
        console.log(`💵 No advance used, Full Cash Payment: ₹${cashPaymentNeeded}`);
      }
    }

    // STEP 3: Generate payment number (with branch context)
    const currentFY = getCurrentFinancialYear();
    
    // 🆕 Get branch details for prefix
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('document_prefix, name')
      .eq('id', branch_id)
      .eq('company_id', company_id)
      .single();

    if (branchError || !branch) {
      console.error('❌ Branch not found:', branchError);
      return res.status(400).json({
        success: false,
        error: 'Branch not found'
      });
    }

    const branchPrefix = branch.document_prefix || 'BR';
    console.log('🏢 Branch prefix:', branchPrefix);
    
    const { data: sequence, error: seqError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('branch_id', branch_id)  // 🔥 Filter by branch
      .eq('document_type', 'payment_made')
      .eq('is_active', true)
      .maybeSingle();

    if (seqError) {
      console.error('Error fetching sequence:', seqError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch document sequence'
      });
    }

    let payment_number;
    if (sequence) {
      const { data: updatedSeq, error: incrementError } = await supabaseAdmin
        .from('document_sequences')
        .update({ 
          current_number: sequence.current_number + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequence.id)
        .eq('current_number', sequence.current_number)
        .select()
        .single();

      if (incrementError || !updatedSeq) {
        console.error('Failed to increment sequence:', incrementError);
        payment_number = `${branchPrefix}-PM-${Date.now()}`;
      } else {
        const paddedNumber = sequence.current_number.toString().padStart(sequence.padding_zeros || 4, '0');
        payment_number = `${branchPrefix}-${sequence.prefix || ''}${paddedNumber}/${currentFY.substring(2)}`;
      }
    } else {
      payment_number = `${branchPrefix}-PM-0001/${currentFY.substring(2)}`;
    }

    console.log(`✅ Generated payment number: ${payment_number}`);

    // STEP 4: Create vendor payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('vendor_payments')
      .insert({
        company_id,
        branch_id,  // 🔥 NEW: Add branch_id
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

    // STEP 5: Process bill payments (if not advance)
    if (!isAdvancePayment && bill_payments.length > 0) {
      const billPaymentRecords = [];
      
      for (const bp of bill_payments) {
        const paymentAmount = parseFloat(bp.payment_amount || 0);
        
        if (paymentAmount <= 0) continue;

        const { data: bill, error: billError } = await supabaseAdmin
          .from('purchase_documents')
          .select('balance_amount, paid_amount, total_amount')
          .eq('id', bp.bill_id)
          .single();

        if (billError) throw billError;

        if (paymentAmount > parseFloat(bill.balance_amount)) {
          throw new Error(`Payment amount (${paymentAmount}) exceeds balance (${bill.balance_amount})`);
        }

        billPaymentRecords.push({
          payment_id: payment.id,
          bill_id: bp.bill_id,
          bill_number: bp.bill_number,
          payment_amount: paymentAmount
        });

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

      if (billPaymentRecords.length > 0) {
        const { error: billPaymentsError } = await supabaseAdmin
          .from('bill_payments')
          .insert(billPaymentRecords);

        if (billPaymentsError) throw billPaymentsError;
      }
    }

    // STEP 6: Update vendor balance
    const { error: vendorUpdateError } = await supabaseAdmin.rpc('update_vendor_balance', {
      p_vendor_id: vendor_id,
      p_amount: -totalPaymentRequired
    });

    if (vendorUpdateError) {
      const { data: currentVendor } = await supabaseAdmin
        .from('vendors')
        .select('current_balance')
        .eq('id', vendor_id)
        .single();

      if (currentVendor) {
        await supabaseAdmin
          .from('vendors')
          .update({ 
            current_balance: parseFloat(currentVendor.current_balance || 0) - totalPaymentRequired 
          })
          .eq('id', vendor_id);
      }
    }

    // STEP 7: Handle advance adjustment
    if (advanceToAdjust > 0) {
      await supabaseAdmin
        .from('vendor_advances')
        .insert({
          company_id,
          vendor_id,
          advance_type: 'adjusted',
          amount: advanceToAdjust,
          source_type: 'payment',
          source_id: payment.id,
          source_number: payment.payment_number,
          notes: `Advance adjusted against payment #${payment.payment_number}`,
          created_at: new Date().toISOString()
        });

      await supabaseAdmin
        .from('vendors')
        .update({
          advance_amount: vendorAdvance - advanceToAdjust,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendor_id);

      console.log(`✅ Vendor advance reduced: ₹${vendorAdvance} → ₹${vendorAdvance - advanceToAdjust}`);
    }

    // STEP 8: Handle pure advance payment
    if (isAdvancePayment) {
      await supabaseAdmin
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

      await supabaseAdmin
        .from('vendors')
        .update({
          advance_amount: vendorAdvance + totalPaymentRequired,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendor_id);

      console.log(`✅ Vendor advance increased: ₹${vendorAdvance} → ₹${vendorAdvance + totalPaymentRequired}`);
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

export default withAuth(handler);