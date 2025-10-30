import { supabaseAdmin } from '../../services/utils/supabase'
import { withAuth } from '../../lib/middleware'

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
    // Test: Get all accounts for the company
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type, account_subtype')
      .eq('company_id', company_id)
      .limit(5)

    if (accountsError) throw accountsError

    // Test: Get cash and bank accounts
    const cashAccounts = accounts.filter(acc => 
      acc.account_type === 'asset' && 
      (acc.account_subtype === 'cash' || acc.account_subtype === 'bank')
    )

    return res.status(200).json({
      success: true,
      data: {
        totalAccounts: accounts.length,
        cashAccounts: cashAccounts.length,
        sampleAccounts: accounts,
        cashAccountDetails: cashAccounts
      }
    })
  } catch (error) {
    console.error('Test Cash Flow API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to test cash flow data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)