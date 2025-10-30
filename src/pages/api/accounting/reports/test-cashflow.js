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
    // Test 1: Get all accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type, account_subtype')
      .eq('company_id', company_id)
      .limit(10)

    if (accountsError) {
      console.error('Accounts Error:', accountsError)
      throw accountsError
    }

    // Test 2: Identify cash accounts
    const cashAccounts = accounts.filter(acc => 
      acc.account_type === 'asset' && 
      (acc.account_subtype === 'cash' || acc.account_subtype === 'bank')
    )

    // Test 3: Get recent journal entries
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const toDate = new Date().toISOString().split('T')[0]
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: journalEntries, error: entriesError } = await supabaseAdmin
      .from('journal_entries')
      .select('id, entry_date, narration')
      .eq('company_id', company_id)
      .gte('entry_date', fromDate)
      .lte('entry_date', toDate)
      .eq('status', 'posted')
      .limit(5)

    if (entriesError) {
      console.error('Journal Entries Error:', entriesError)
    }

    return res.status(200).json({
      success: true,
      data: {
        testRun: new Date().toISOString(),
        company_id,
        accounts: {
          total: accounts.length,
          sample: accounts.slice(0, 3)
        },
        cashAccounts: {
          total: cashAccounts.length,
          sample: cashAccounts.slice(0, 3)
        },
        recentEntries: {
          total: journalEntries?.length || 0,
          sample: journalEntries?.slice(0, 3) || []
        },
        dateRange: {
          from: fromDate,
          to: toDate
        }
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