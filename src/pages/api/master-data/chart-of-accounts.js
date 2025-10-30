import { supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

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
    // Get chart of accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select(`
        id,
        account_code,
        account_name,
        account_type,
        account_subtype,
        current_balance,
        opening_balance
      `)
      .eq('company_id', company_id)
      .order('account_code')

    if (accountsError) throw accountsError

    return res.status(200).json({
      success: true,
      data: accounts || []
    })
  } catch (error) {
    console.error('Chart of Accounts API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch chart of accounts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)