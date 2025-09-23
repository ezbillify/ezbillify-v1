import { supabase } from './utils/supabase'

class AccountingService {
  // Journal Entries
  async createJournalEntry(companyId, entryData) {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([{
        ...entryData,
        company_id: companyId
      }])
      .select()

    if (error) throw error
    return data[0]
  }

  async getJournalEntries(companyId, filters = {}) {
    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        journal_entry_items(
          *,
          account:account_id(account_code, account_name)
        )
      `)
      .eq('company_id', companyId)

    if (filters.dateFrom) {
      query = query.gte('entry_date', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('entry_date', filters.dateTo)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query.order('entry_date', { ascending: false })

    if (error) throw error
    return data
  }

  // Trial Balance
  async getTrialBalance(companyId, asOfDate = new Date()) {
    const { data, error } = await supabase
      .rpc('get_trial_balance', {
        p_company_id: companyId,
        p_as_of_date: asOfDate.toISOString().split('T')[0]
      })

    if (error) throw error
    return data
  }

  // Balance Sheet
  async getBalanceSheet(companyId, asOfDate = new Date()) {
    const { data, error } = await supabase
      .rpc('get_balance_sheet', {
        p_company_id: companyId,
        p_as_of_date: asOfDate.toISOString().split('T')[0]
      })

    if (error) throw error

    // Group accounts by type
    const assets = data.filter(item => item.account_type === 'asset')
    const liabilities = data.filter(item => item.account_type === 'liability')
    const equity = data.filter(item => item.account_type === 'equity')

    return {
      assets,
      liabilities,
      equity,
      totalAssets: assets.reduce((sum, item) => sum + item.balance, 0),
      totalLiabilities: liabilities.reduce((sum, item) => sum + item.balance, 0),
      totalEquity: equity.reduce((sum, item) => sum + item.balance, 0)
    }
  }

  // Profit & Loss
  async getProfitLoss(companyId, fromDate, toDate) {
    const { data, error } = await supabase
      .rpc('get_profit_loss', {
        p_company_id: companyId,
        p_from_date: fromDate,
        p_to_date: toDate
      })

    if (error) throw error

    const income = data.filter(item => item.account_type === 'income')
    const expenses = data.filter(item => item.account_type === 'expense')
    const cogs = data.filter(item => item.account_type === 'cogs')

    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0)
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0)
    const totalCOGS = cogs.reduce((sum, item) => sum + item.amount, 0)

    return {
      income,
      expenses,
      cogs,
      totalIncome,
      totalExpenses,
      totalCOGS,
      grossProfit: totalIncome - totalCOGS,
      netProfit: totalIncome - totalCOGS - totalExpenses
    }
  }

  // Cash Flow Statement
  async getCashFlowStatement(companyId, fromDate, toDate) {
    const { data, error } = await supabase
      .rpc('get_cash_flow', {
        p_company_id: companyId,
        p_from_date: fromDate,
        p_to_date: toDate
      })

    if (error) throw error

    // Categorize cash flows
    const operating = data.filter(item => item.category === 'operating')
    const investing = data.filter(item => item.category === 'investing')
    const financing = data.filter(item => item.category === 'financing')

    return {
      operating,
      investing,
      financing,
      netOperatingCashFlow: operating.reduce((sum, item) => sum + item.amount, 0),
      netInvestingCashFlow: investing.reduce((sum, item) => sum + item.amount, 0),
      netFinancingCashFlow: financing.reduce((sum, item) => sum + item.amount, 0)
    }
  }

  // Account Ledger
  async getAccountLedger(accountId, fromDate, toDate) {
    const { data, error } = await supabase
      .from('journal_entry_items')
      .select(`
        *,
        journal_entry:journal_entry_id(
          entry_number,
          entry_date,
          narration,
          reference_type,
          reference_number
        )
      `)
      .eq('account_id', accountId)
      .gte('journal_entry.entry_date', fromDate)
      .lte('journal_entry.entry_date', toDate)
      .order('journal_entry.entry_date')

    if (error) throw error

    // Calculate running balance
    let runningBalance = 0
    const ledgerEntries = data.map(item => {
      runningBalance += (item.debit_amount || 0) - (item.credit_amount || 0)
      return {
        ...item,
        running_balance: runningBalance
      }
    })

    return ledgerEntries
  }

  // Bank Reconciliation
  async getBankReconciliation(bankAccountId, statementDate) {
    const { data, error } = await supabase
      .from('bank_reconciliation')
      .select(`
        *,
        bank_account:bank_account_id(account_name, account_number)
      `)
      .eq('bank_account_id', bankAccountId)
      .eq('statement_date', statementDate)

    if (error) throw error
    return data
  }

  // Financial Ratios
  async calculateFinancialRatios(companyId, asOfDate = new Date()) {
    const balanceSheet = await this.getBalanceSheet(companyId, asOfDate)
    const profitLoss = await this.getProfitLoss(
      companyId, 
      new Date(asOfDate.getFullYear(), 0, 1), // Start of year
      asOfDate
    )

    // Liquidity Ratios
    const currentAssets = balanceSheet.assets
      .filter(item => item.account_subtype === 'current_asset')
      .reduce((sum, item) => sum + item.balance, 0)

    const currentLiabilities = balanceSheet.liabilities
      .filter(item => item.account_subtype === 'current_liability')
      .reduce((sum, item) => sum + item.balance, 0)

    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0

    // Profitability Ratios
    const netProfitMargin = profitLoss.totalIncome > 0 ? 
      (profitLoss.netProfit / profitLoss.totalIncome) * 100 : 0

    const grossProfitMargin = profitLoss.totalIncome > 0 ? 
      (profitLoss.grossProfit / profitLoss.totalIncome) * 100 : 0

    // Leverage Ratios
    const debtToEquity = balanceSheet.totalEquity > 0 ? 
      balanceSheet.totalLiabilities / balanceSheet.totalEquity : 0

    return {
      liquidity: {
        currentRatio,
        workingCapital: currentAssets - currentLiabilities
      },
      profitability: {
        netProfitMargin,
        grossProfitMargin,
        returnOnAssets: balanceSheet.totalAssets > 0 ? 
          (profitLoss.netProfit / balanceSheet.totalAssets) * 100 : 0
      },
      leverage: {
        debtToEquity,
        debtRatio: balanceSheet.totalAssets > 0 ? 
          balanceSheet.totalLiabilities / balanceSheet.totalAssets : 0
      }
    }
  }

  // Audit Trail
  async getAuditTrail(companyId, filters = {}) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('company_id', companyId)

    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType)
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // Month-end closing
  async performMonthEndClose(companyId, periodEndDate) {
    try {
      // Create closing entries for income and expense accounts
      const profitLoss = await this.getProfitLoss(
        companyId,
        new Date(periodEndDate.getFullYear(), periodEndDate.getMonth(), 1),
        periodEndDate
      )

      // Create journal entry to close income and expense accounts
      const closingEntry = await this.createJournalEntry(companyId, {
        entry_date: periodEndDate,
        entry_type: 'closing',
        narration: `Month-end closing for ${periodEndDate.toLocaleDateString()}`,
        total_debit: profitLoss.totalIncome,
        total_credit: profitLoss.totalExpenses + profitLoss.totalCOGS,
        status: 'posted'
      })

      return {
        success: true,
        closingEntry,
        netProfit: profitLoss.netProfit
      }
    } catch (error) {
      throw new Error(`Month-end closing failed: ${error.message}`)
    }
  }
}

export default new AccountingService()