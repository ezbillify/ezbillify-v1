// pages/api/purchase/payments-made/summary.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  if (method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Total Payables (all unpaid and partially paid bills)
    const { data: payablesBills } = await supabaseAdmin
      .from('purchase_documents')
      .select('balance_amount')
      .eq('company_id', company_id)
      .eq('document_type', 'bill')
      .in('payment_status', ['unpaid', 'partially_paid'])

    const totalPayables = payablesBills?.reduce((sum, bill) => sum + parseFloat(bill.balance_amount || 0), 0) || 0

    // Overdue Payables (bills past due date)
    const today = new Date().toISOString().split('T')[0]
    const { data: overdueBills } = await supabaseAdmin
      .from('purchase_documents')
      .select('balance_amount')
      .eq('company_id', company_id)
      .eq('document_type', 'bill')
      .in('payment_status', ['unpaid', 'partially_paid'])
      .lt('due_date', today)

    const overduePayables = overdueBills?.reduce((sum, bill) => sum + parseFloat(bill.balance_amount || 0), 0) || 0

    // Due This Month
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: monthBills } = await supabaseAdmin
      .from('purchase_documents')
      .select('balance_amount')
      .eq('company_id', company_id)
      .eq('document_type', 'bill')
      .in('payment_status', ['unpaid', 'partially_paid'])
      .gte('due_date', firstDayOfMonth)
      .lte('due_date', lastDayOfMonth)

    const dueThisMonth = monthBills?.reduce((sum, bill) => sum + parseFloat(bill.balance_amount || 0), 0) || 0

    // Total Vendors with Outstanding Balance
    const { data: vendors } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .gt('current_balance', 0)

    const totalVendors = vendors?.length || 0

    return res.status(200).json({
      success: true,
      data: {
        total_payables: totalPayables,
        overdue_payables: overduePayables,
        due_this_month: dueThisMonth,
        total_vendors: totalVendors
      }
    })
  } catch (error) {
    console.error('Payables summary error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch payables summary',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)