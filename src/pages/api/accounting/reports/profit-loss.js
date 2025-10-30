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

  const { company_id, from_date, to_date } = req.query

  if (!company_id || !from_date || !to_date) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, from date, and to date are required'
    })
  }

  try {
    // Get income, expense, and COGS accounts
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
      .in('account_type', ['income', 'expense', 'cogs'])

    if (accountsError) throw accountsError

    // Get journal entries within the date range to calculate period balances
    const { data: journalEntries, error: entriesError } = await supabaseAdmin
      .from('journal_entries')
      .select(`
        id,
        entry_date
      `)
      .eq('company_id', company_id)
      .gte('entry_date', from_date)
      .lte('entry_date', to_date)
      .eq('status', 'posted')

    if (entriesError) throw entriesError

    const entryIds = journalEntries.map(entry => entry.id)

    if (entryIds.length === 0) {
      // No entries in the period, return zero balances
      const incomeAccounts = accounts.filter(acc => acc.account_type === 'income')
      const expenseAccounts = accounts.filter(acc => acc.account_type === 'expense')
      const cogsAccounts = accounts.filter(acc => acc.account_type === 'cogs')

      return res.status(200).json({
        success: true,
        data: {
          period: {
            from: from_date,
            to: to_date
          },
          income: {
            accounts: incomeAccounts.map(acc => ({ ...acc, period_balance: 0 })),
            total: 0
          },
          cogs: {
            accounts: cogsAccounts.map(acc => ({ ...acc, period_balance: 0 })),
            total: 0
          },
          expenses: {
            accounts: expenseAccounts.map(acc => ({ ...acc, period_balance: 0 })),
            total: 0
          },
          grossProfit: 0,
          netProfit: 0
        }
      })
    }

    // Get journal entry items for these entries
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('journal_entry_items')
      .select(`
        account_id,
        debit_amount,
        credit_amount
      `)
      .in('journal_entry_id', entryIds)

    if (itemsError) throw itemsError

    // Calculate period balances for each account
    const periodBalances = {}
    items.forEach(item => {
      if (!periodBalances[item.account_id]) {
        periodBalances[item.account_id] = 0
      }
      
      // For income and liability accounts, credit increases balance
      // For expense and asset accounts, debit increases balance
      const account = accounts.find(acc => acc.id === item.account_id)
      if (account) {
        if (account.account_type === 'income') {
          periodBalances[item.account_id] += (item.credit_amount || 0) - (item.debit_amount || 0)
        } else if (account.account_type === 'expense' || account.account_type === 'cogs') {
          periodBalances[item.account_id] += (item.debit_amount || 0) - (item.credit_amount || 0)
        }
      }
    })

    // Categorize accounts with period balances
    const incomeAccounts = accounts
      .filter(acc => acc.account_type === 'income')
      .map(acc => ({
        ...acc,
        period_balance: periodBalances[acc.id] || 0
      }))

    const expenseAccounts = accounts
      .filter(acc => acc.account_type === 'expense')
      .map(acc => ({
        ...acc,
        period_balance: periodBalances[acc.id] || 0
      }))

    const cogsAccounts = accounts
      .filter(acc => acc.account_type === 'cogs')
      .map(acc => ({
        ...acc,
        period_balance: periodBalances[acc.id] || 0
      }))

    // Calculate totals
    const totalIncome = incomeAccounts.reduce((sum, acc) => sum + (acc.period_balance || 0), 0)
    const totalCOGS = cogsAccounts.reduce((sum, acc) => sum + (acc.period_balance || 0), 0)
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + (acc.period_balance || 0), 0)

    const grossProfit = totalIncome - totalCOGS
    const netProfit = totalIncome - totalCOGS - totalExpenses

    return res.status(200).json({
      success: true,
      data: {
        period: {
          from: from_date,
          to: to_date
        },
        income: {
          accounts: incomeAccounts,
          total: totalIncome
        },
        cogs: {
          accounts: cogsAccounts,
          total: totalCOGS
        },
        expenses: {
          accounts: expenseAccounts,
          total: totalExpenses
        },
        grossProfit: grossProfit,
        netProfit: netProfit,
        netProfitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0
      }
    })
  } catch (error) {
    console.error('Profit & Loss API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate profit & loss statement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)