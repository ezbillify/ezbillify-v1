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

  const { company_id, bank_account_id, statement_date } = req.query

  if (!company_id || !bank_account_id || !statement_date) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, bank account ID, and statement date are required'
    })
  }

  try {
    // Get bank account details
    const { data: bankAccount, error: accountError } = await supabaseAdmin
      .from('bank_accounts')
      .select(`
        id,
        account_name,
        account_number,
        bank_name,
        current_balance
      `)
      .eq('id', bank_account_id)
      .eq('company_id', company_id)
      .single()

    if (accountError) throw accountError
    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        error: 'Bank account not found'
      })
    }

    // Get bank transactions for the period
    const { data: bankTransactions, error: transactionsError } = await supabaseAdmin
      .from('bank_transactions')
      .select(`
        id,
        transaction_date,
        description,
        debit_amount,
        credit_amount,
        running_balance,
        reference_number
      `)
      .eq('bank_account_id', bank_account_id)
      .lte('transaction_date', statement_date)
      .order('transaction_date', { ascending: true })

    if (transactionsError) throw transactionsError

    // Get accounting entries for the same period that affect this bank account
    const { data: accountingEntries, error: entriesError } = await supabaseAdmin
      .from('journal_entry_items')
      .select(`
        id,
        debit_amount,
        credit_amount,
        description,
        journal_entry:journal_entry_id(
          entry_date,
          entry_number,
          narration
        )
      `)
      .eq('account_id', bank_account_id)
      .lte('journal_entry.entry_date', statement_date)
      .order('journal_entry.entry_date', { ascending: true })

    if (entriesError) throw entriesError

    // Calculate balances
    const bankBalance = bankTransactions.length > 0 
      ? bankTransactions[bankTransactions.length - 1].running_balance 
      : 0

    const accountingBalance = accountingEntries.reduce((balance, entry) => {
      return balance + (entry.debit_amount || 0) - (entry.credit_amount || 0)
    }, bankAccount.opening_balance || 0)

    const difference = bankBalance - accountingBalance

    return res.status(200).json({
      success: true,
      data: {
        bankAccount,
        statementDate: statement_date,
        bankTransactions: bankTransactions || [],
        accountingEntries: accountingEntries || [],
        balances: {
          bankBalance,
          accountingBalance,
          difference
        }
      }
    })
  } catch (error) {
    console.error('Bank Reconciliation API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bank reconciliation data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)