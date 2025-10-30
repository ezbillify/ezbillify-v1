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
    // Get all accounts to identify cash accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select(`
        id,
        account_code,
        account_name,
        account_type,
        account_subtype
      `)
      .eq('company_id', company_id)

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError)
      throw accountsError
    }
    
    console.log('Found accounts:', accounts?.length)

    // Identify cash and bank accounts
    const cashAccounts = accounts.filter(acc => 
      acc.account_type === 'asset' && 
      (acc.account_subtype === 'cash' || acc.account_subtype === 'bank')
    )

    const cashAccountIds = cashAccounts.map(acc => acc.id)
    
    console.log('Cash accounts found:', cashAccounts.length)
    console.log('Cash account IDs:', cashAccountIds)

    if (cashAccountIds.length === 0) {
      console.log('No cash accounts found for company:', company_id)
      return res.status(200).json({
        success: true,
        data: {
          period: {
            from: from_date,
            to: to_date
          },
          operating: {
            items: [],
            net: 0
          },
          investing: {
            items: [],
            net: 0
          },
          financing: {
            items: [],
            net: 0
          },
          summary: {
            netOperating: 0,
            netInvesting: 0,
            netFinancing: 0,
            netCashFlow: 0,
            openingBalance: 0,
            closingBalance: 0
          }
        }
      })
    }

    // Get journal entries within the date range
    const { data: journalEntries, error: entriesError } = await supabaseAdmin
      .from('journal_entries')
      .select(`
        id,
        entry_date,
        narration,
        reference_type,
        reference_number
      `)
      .eq('company_id', company_id)
      .gte('entry_date', from_date)
      .lte('entry_date', to_date)
      .eq('status', 'posted')

    if (entriesError) {
      console.error('Error fetching journal entries:', entriesError)
      throw entriesError
    }
    
    console.log('Found journal entries:', journalEntries?.length)

    const entryIds = journalEntries.map(entry => entry.id)

    if (entryIds.length === 0) {
      console.log('No journal entries found for the period')
      return res.status(200).json({
        success: true,
        data: {
          period: {
            from: from_date,
            to: to_date
          },
          operating: {
            items: [],
            net: 0
          },
          investing: {
            items: [],
            net: 0
          },
          financing: {
            items: [],
            net: 0
          },
          summary: {
            netOperating: 0,
            netInvesting: 0,
            netFinancing: 0,
            netCashFlow: 0,
            openingBalance: 0,
            closingBalance: 0
          }
        }
      })
    }

    // Get journal entry items for cash accounts within the period
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('journal_entry_items')
      .select(`
        *,
        journal_entry:journal_entry_id(
          entry_date,
          narration,
          reference_type,
          reference_number
        )
      `)
      .in('account_id', cashAccountIds)
      .in('journal_entry_id', entryIds)
      .order('journal_entry.entry_date', { ascending: true })

    if (itemsError) {
      console.error('Error fetching journal entry items:', itemsError)
      throw itemsError
    }
    
    console.log('Found journal entry items:', items?.length)

    // Categorize cash flows
    const operating = []
    const investing = []
    const financing = []

    items.forEach(item => {
      const cashFlow = {
        date: item.journal_entry.entry_date,
        description: item.journal_entry.narration,
        reference: item.journal_entry.reference_number,
        debit: item.debit_amount || 0,
        credit: item.credit_amount || 0,
        net: (item.debit_amount || 0) - (item.credit_amount || 0)
      }

      // Categorize based on reference type or narration keywords
      const refType = (item.journal_entry.reference_type || '').toLowerCase()
      const narration = (item.journal_entry.narration || '').toLowerCase()

      // Operating activities (most common cash flows)
      if (refType.includes('sales') || refType.includes('purchase') || refType.includes('invoice') || refType.includes('receipt') || refType.includes('payment') ||
          narration.includes('sales') || narration.includes('purchase') || narration.includes('invoice') || narration.includes('receipt') || narration.includes('payment') || narration.includes('salary') || narration.includes('wages') || narration.includes('rent') || narration.includes('utility')) {
        operating.push(cashFlow)
      } 
      // Investing activities
      else if (refType.includes('asset') || refType.includes('equipment') || refType.includes('investment') || refType.includes('purchase') ||
                 narration.includes('asset') || narration.includes('equipment') || narration.includes('investment') || narration.includes('purchase of') || narration.includes('sale of')) {
        investing.push(cashFlow)
      } 
      // Financing activities
      else if (refType.includes('loan') || refType.includes('capital') || refType.includes('dividend') || refType.includes('equity') ||
                 narration.includes('loan') || narration.includes('capital') || narration.includes('dividend') || narration.includes('equity') || narration.includes('borrowing')) {
        financing.push(cashFlow)
      } 
      // Default to operating (most cash flows are operating activities)
      else {
        operating.push(cashFlow)
      }
    })

    // Calculate totals
    const netOperating = operating.reduce((sum, item) => sum + item.net, 0)
    const netInvesting = investing.reduce((sum, item) => sum + item.net, 0)
    const netFinancing = financing.reduce((sum, item) => sum + item.net, 0)

    const netCashFlow = netOperating + netInvesting + netFinancing

    // Get opening balance - calculate from account current balances
    // In a real implementation, this would be the balance as of the day before from_date
    let openingBalance = 0
    
    // For now, we'll use the current balance of cash accounts as opening balance
    // A more accurate implementation would calculate the balance as of from_date - 1 day
    const { data: accountBalances, error: balancesError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('id, current_balance')
      .in('id', cashAccountIds)

    if (!balancesError && accountBalances) {
      openingBalance = accountBalances.reduce((sum, account) => sum + (account.current_balance || 0), 0)
    }

    // Calculate closing balance
    const closingBalance = openingBalance + netCashFlow

    return res.status(200).json({
      success: true,
      data: {
        period: {
          from: from_date,
          to: to_date
        },
        operating: {
          items: operating,
          net: netOperating
        },
        investing: {
          items: investing,
          net: netInvesting
        },
        financing: {
          items: financing,
          net: netFinancing
        },
        summary: {
          netOperating,
          netInvesting,
          netFinancing,
          netCashFlow: netCashFlow,
          openingBalance: openingBalance,
          closingBalance: closingBalance
        }
      }
    })
  } catch (error) {
    console.error('Cash Flow API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate cash flow statement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)