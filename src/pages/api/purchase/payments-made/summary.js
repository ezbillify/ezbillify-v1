// pages/api/purchase/payments-made/summary.js
import { supabaseAdmin } from '../../../../services/utils/supabase';
import { withAuth } from '../../../../lib/middleware';

async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { company_id } = req.query;

  if (!company_id) {
    return res.status(400).json({ success: false, error: 'Company ID is required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    // Total Payables
    const { data: payablesBills } = await supabaseAdmin
      .from('purchase_documents')
      .select('balance_amount')
      .eq('company_id', company_id)
      .eq('document_type', 'bill')
      .in('payment_status', ['unpaid', 'partially_paid']);

    const totalPayables = payablesBills?.reduce((sum, bill) => 
      sum + parseFloat(bill.balance_amount || 0), 0) || 0;

    // Overdue Payables
    const { data: overdueBills } = await supabaseAdmin
      .from('purchase_documents')
      .select('balance_amount')
      .eq('company_id', company_id)
      .eq('document_type', 'bill')
      .in('payment_status', ['unpaid', 'partially_paid'])
      .not('due_date', 'is', null)
      .lt('due_date', today);

    const overduePayables = overdueBills?.reduce((sum, bill) => 
      sum + parseFloat(bill.balance_amount || 0), 0) || 0;

    // Due This Month
    const { data: monthBills } = await supabaseAdmin
      .from('purchase_documents')
      .select('balance_amount')
      .eq('company_id', company_id)
      .eq('document_type', 'bill')
      .in('payment_status', ['unpaid', 'partially_paid'])
      .not('due_date', 'is', null)
      .gte('due_date', firstDayThisMonth)
      .lte('due_date', lastDayThisMonth);

    const dueThisMonth = monthBills?.reduce((sum, bill) => 
      sum + parseFloat(bill.balance_amount || 0), 0) || 0;

    // Vendors with Outstanding
    const { data: vendors } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .gt('current_balance', 0);

    // Payments This Month
    const { data: paymentsThisMonth } = await supabaseAdmin
      .from('vendor_payments')
      .select('amount')
      .eq('company_id', company_id)
      .gte('payment_date', firstDayThisMonth)
      .lte('payment_date', lastDayThisMonth);

    const totalPaidThisMonth = paymentsThisMonth?.reduce((sum, p) => 
      sum + parseFloat(p.amount || 0), 0) || 0;

    // Payments Last Month
    const { data: paymentsLastMonth } = await supabaseAdmin
      .from('vendor_payments')
      .select('amount')
      .eq('company_id', company_id)
      .gte('payment_date', firstDayLastMonth)
      .lte('payment_date', lastDayLastMonth);

    const totalPaidLastMonth = paymentsLastMonth?.reduce((sum, p) => 
      sum + parseFloat(p.amount || 0), 0) || 0;

    // Calculate percentage change
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const paidChange = calculateChange(totalPaidThisMonth, totalPaidLastMonth);

    return res.status(200).json({
      success: true,
      data: {
        total_payables: totalPayables,
        overdue_payables: overduePayables,
        due_this_month: dueThisMonth,
        total_vendors: vendors?.length || 0,
        paid_this_month: totalPaidThisMonth,
        paid_last_month: totalPaidLastMonth,
        paid_change_percentage: paidChange
      }
    });
  } catch (error) {
    console.error('Summary error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default withAuth(handler);