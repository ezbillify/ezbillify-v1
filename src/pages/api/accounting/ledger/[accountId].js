import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { accountId } = req.query

  if (method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  if (!accountId) {
    return res.status(400).json({
      success: false,
      error: 'Account ID is required'
    })
  }

  const { company_id, from_date, to_date } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Get account details
    const { data: account, error: accountError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select(`
        id,
        account_code,
        account_name,
        account_type,
        current_balance,
        opening_balance
      `)
      .eq('id', accountId)
      .eq('company_id', company_id)
      .single()

    if (accountError) throw accountError
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      })
    }

    // Get journal entry items for this account
    let query = supabaseAdmin
      .from('journal_entry_items')
      .select(`
        *,
        journal_entry:journal_entry_id(
          entry_number,
          entry_date,
          narration,
          reference_type,
          reference_number,
          status
        )
      `)
      .eq('account_id', accountId)
      .eq('journal_entry.company_id', company_id)
      .order('journal_entry.entry_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (from_date) {
      query = query.gte('journal_entry.entry_date', from_date)
    }

    if (to_date) {
      query = query.lte('journal_entry.entry_date', to_date)
    }

    const { data: items, error: itemsError } = await query

    if (itemsError) throw itemsError

    // Calculate running balance
    let runningBalance = account.opening_balance || 0
    const ledgerItems = items.map(item => {
      // Determine if this is a debit or credit entry for this account
      const debit = item.debit_amount || 0
      const credit = item.credit_amount || 0
      
      // Update running balance
      if (account.account_type === 'asset' || account.account_type === 'expense' || account.account_type === 'cogs') {
        // Normal debit balance accounts
        runningBalance += debit - credit
      } else {
        // Normal credit balance accounts (liability, equity, income)
        runningBalance += credit - debit
      }

      return {
        ...item,
        running_balance: runningBalance
      }
    })

    return res.status(200).json({
      success: true,
      data: {
        account,
        items: ledgerItems,
        openingBalance: account.opening_balance || 0,
        currentBalance: account.current_balance || 0,
        fromDate: from_date,
        toDate: to_date
      }
    })
  } catch (error) {
    console.error('Account Ledger API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch account ledger',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)