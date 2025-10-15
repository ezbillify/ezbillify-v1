// pages/api/purchase/returns/summary.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  if (req.method !== 'GET') {
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
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

    // Total returns this month
    const { data: thisMonthReturns } = await supabaseAdmin
      .from('purchase_documents')
      .select('total_amount')
      .eq('company_id', company_id)
      .eq('document_type', 'debit_note')
      .gte('document_date', startOfMonth)

    const returnedThisMonth = thisMonthReturns?.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0) || 0

    // Total returns last month
    const { data: lastMonthReturns } = await supabaseAdmin
      .from('purchase_documents')
      .select('total_amount')
      .eq('company_id', company_id)
      .eq('document_type', 'debit_note')
      .gte('document_date', startOfLastMonth)
      .lte('document_date', endOfLastMonth)

    const returnedLastMonth = lastMonthReturns?.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0) || 0

    // Calculate change percentage
    const returnChangePercentage = returnedLastMonth > 0 
      ? ((returnedThisMonth - returnedLastMonth) / returnedLastMonth) * 100 
      : 0

    // Total draft returns
    const { data: draftReturns } = await supabaseAdmin
      .from('purchase_documents')
      .select('total_amount')
      .eq('company_id', company_id)
      .eq('document_type', 'debit_note')
      .eq('status', 'draft')

    const totalDraftReturns = draftReturns?.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0) || 0

    // Count total returns
    const { count: totalReturnsCount } = await supabaseAdmin
      .from('purchase_documents')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .eq('document_type', 'debit_note')

    // Count vendors with returns this month
    const { data: vendorsWithReturns } = await supabaseAdmin
      .from('purchase_documents')
      .select('vendor_id')
      .eq('company_id', company_id)
      .eq('document_type', 'debit_note')
      .gte('document_date', startOfMonth)

    const uniqueVendors = new Set(vendorsWithReturns?.map(r => r.vendor_id) || [])

    return res.status(200).json({
      success: true,
      data: {
        returned_this_month: returnedThisMonth,
        returned_last_month: returnedLastMonth,
        return_change_percentage: returnChangePercentage,
        total_draft_returns: totalDraftReturns,
        total_returns_count: totalReturnsCount || 0,
        vendors_with_returns: uniqueVendors.size
      }
    })

  } catch (error) {
    console.error('Error fetching return summary:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch return summary'
    })
  }
}

export default withAuth(handler)