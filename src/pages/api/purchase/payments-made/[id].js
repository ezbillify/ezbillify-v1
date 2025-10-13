// pages/api/purchase/payments-made/[id].js
import { supabaseAdmin } from '../../../../services/utils/supabase';
import { withAuth } from '../../../../lib/middleware';

async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  if (method === 'GET') {
    return handleGet(req, res, id);
  } else if (method === 'DELETE') {
    return handleDelete(req, res, id);
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function handleGet(req, res, id) {
  const { company_id } = req.query;

  if (!company_id) {
    return res.status(400).json({ success: false, error: 'Company ID is required' });
  }

  try {
    const { data: payment, error } = await supabaseAdmin
      .from('vendor_payments')
      .select(`
        *,
        vendor:vendors(vendor_name, vendor_code, gstin, billing_address),
        bank_account:bank_accounts(account_name, bank_name, account_number),
        bill_payments(
          id,
          bill_number,
          payment_amount,
          bill:purchase_documents(
            id,
            document_number,
            document_date,
            total_amount,
            paid_amount,
            balance_amount
          )
        )
      `)
      .eq('id', id)
      .eq('company_id', company_id)
      .single();

    if (error) throw error;

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleDelete(req, res, id) {
  const { company_id } = req.body;

  if (!company_id) {
    return res.status(400).json({ success: false, error: 'Company ID is required' });
  }

  try {
    // Get payment details first
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('vendor_payments')
      .select(`
        *,
        bill_payments(bill_id, payment_amount, bill:purchase_documents(paid_amount, total_amount))
      `)
      .eq('id', id)
      .eq('company_id', company_id)
      .single();

    if (fetchError) throw fetchError;

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Reverse bill payments
    for (const bp of payment.bill_payments) {
      const bill = bp.bill;
      const newPaidAmount = parseFloat(bill.paid_amount) - parseFloat(bp.payment_amount);
      const newBalanceAmount = parseFloat(bill.total_amount) - newPaidAmount;

      let newPaymentStatus = 'unpaid';
      if (newBalanceAmount === 0) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'partially_paid';
      }

      const { error: updateError } = await supabaseAdmin
        .from('purchase_documents')
        .update({
          paid_amount: newPaidAmount,
          balance_amount: newBalanceAmount,
          payment_status: newPaymentStatus
        })
        .eq('id', bp.bill_id);

      if (updateError) throw updateError;
    }

    // Update vendor balance
    const { error: vendorError } = await supabaseAdmin.rpc('update_vendor_balance', {
      p_vendor_id: payment.vendor_id,
      p_amount: parseFloat(payment.amount)
    });

    if (vendorError) {
      // Fallback
      const { data: vendor, error: fetchVendorError } = await supabaseAdmin
        .from('vendors')
        .select('current_balance')
        .eq('id', payment.vendor_id)
        .single();

      if (!fetchVendorError) {
        await supabaseAdmin
          .from('vendors')
          .update({ 
            current_balance: parseFloat(vendor.current_balance || 0) + parseFloat(payment.amount)
          })
          .eq('id', payment.vendor_id);
      }
    }

    // Delete payment (cascade will delete bill_payments)
    const { error: deleteError } = await supabaseAdmin
      .from('vendor_payments')
      .delete()
      .eq('id', id)
      .eq('company_id', company_id);

    if (deleteError) throw deleteError;

    return res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default withAuth(handler);