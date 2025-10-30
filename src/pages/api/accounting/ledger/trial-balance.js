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

  const { company_id, as_of_date } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Get all accounts with their current balances
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select(`
        id,
        account_code,
        account_name,
        account_type,
        current_balance
      `)
      .eq('company_id', company_id)
      .order('account_code')

    if (accountsError) throw accountsError

    // Calculate totals
    let totalDebit = 0
    let totalCredit = 0

    const trialBalance = accounts.map(account => {
      const balance = account.current_balance || 0
      let debit = 0
      let credit = 0

      // Determine if balance should be shown as debit or credit based on account type
      if (account.account_type === 'asset' || account.account_type === 'expense' || account.account_type === 'cogs') {
        // Normal debit balance accounts
        if (balance > 0) {
          debit = balance
        } else {
          credit = Math.abs(balance)
        }
      } else {
        // Normal credit balance accounts (liability, equity, income)
        if (balance > 0) {
          credit = balance
        } else {
          debit = Math.abs(balance)
        }
      }

      totalDebit += debit
      totalCredit += credit

      return {
        ...account,
        debit: debit,
        credit: credit
      }
    })

    return res.status(200).json({
      success: true,
      data: {
        accounts: trialBalance,
        totals: {
          debit: totalDebit,
          credit: totalCredit,
          difference: Math.abs(totalDebit - totalCredit)
        },
        asOfDate: as_of_date || new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Trial Balance API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate trial balance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)