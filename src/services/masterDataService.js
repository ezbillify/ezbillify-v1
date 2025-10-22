import { supabase } from './utils/supabase'

class MasterDataService {
  // Chart of Accounts
  async getAccounts(companyId) {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select(`
        *,
        parent_account:parent_account_id(account_code, account_name)
      `)
      .eq('company_id', companyId)
      .order('account_code')

    if (error) throw error
    return data
  }

  async createAccount(companyId, accountData) {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert([{ ...accountData, company_id: companyId }])
      .select()

    if (error) throw error
    return data[0]
  }

  async updateAccount(accountId, accountData) {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .update(accountData)
      .eq('id', accountId)
      .select()

    if (error) throw error
    return data[0]
  }

  async deleteAccount(accountId) {
    // Check if account is being used
    const { data: usage } = await supabase
      .from('journal_entry_items')
      .select('id')
      .eq('account_id', accountId)
      .limit(1)

    if (usage?.length > 0) {
      throw new Error('Cannot delete account that has transactions')
    }

    const { error } = await supabase
      .from('chart_of_accounts')
      .delete()
      .eq('id', accountId)

    if (error) throw error
    return true
  }

  // Tax Rates
  async getTaxRates(companyId) {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('company_id', companyId)
      .order('tax_type', { ascending: true })
      .order('tax_rate', { ascending: true })

    if (error) throw error
    return data
  }

  async createTaxRate(companyId, taxRateData) {
    // If setting as default, remove default from others
    if (taxRateData.is_default) {
      await supabase
        .from('tax_rates')
        .update({ is_default: false })
        .eq('company_id', companyId)
        .eq('tax_type', taxRateData.tax_type)
    }

    const { data, error } = await supabase
      .from('tax_rates')
      .insert([{ ...taxRateData, company_id: companyId }])
      .select()

    if (error) throw error
    return data[0]
  }

  async updateTaxRate(taxRateId, taxRateData) {
    const { data, error } = await supabase
      .from('tax_rates')
      .update(taxRateData)
      .eq('id', taxRateId)
      .select()

    if (error) throw error
    return data[0]
  }

  async deleteTaxRate(taxRateId) {
    // Check if tax rate is being used
    const { data: itemUsage } = await supabase
      .from('items')
      .select('id')
      .eq('tax_rate_id', taxRateId)
      .limit(1)

    if (itemUsage?.length > 0) {
      throw new Error('Cannot delete tax rate that is assigned to items')
    }

    const { error } = await supabase
      .from('tax_rates')
      .delete()
      .eq('id', taxRateId)

    if (error) throw error
    return true
  }

  // Units
  async getUnits(companyId) {
    const { data, error } = await supabase
      .from('units')
      .select(`
        *,
        base_unit:base_unit_id(unit_name, unit_symbol)
      `)
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .order('unit_type')
      .order('unit_name')

    if (error) throw error
    return data
  }

  async createUnit(companyId, unitData) {
    const { data, error } = await supabase
      .from('units')
      .insert([{ ...unitData, company_id: companyId }])
      .select()

    if (error) throw error
    return data[0]
  }

  async updateUnit(unitId, unitData) {
    const { data, error } = await supabase
      .from('units')
      .update(unitData)
      .eq('id', unitId)
      .select()

    if (error) throw error
    return data[0]
  }

  async deleteUnit(unitId) {
    // Check if unit is being used
    const { data: itemUsage } = await supabase
      .from('items')
      .select('id')
      .or(`primary_unit_id.eq.${unitId},secondary_unit_id.eq.${unitId}`)
      .limit(1)

    if (itemUsage?.length > 0) {
      throw new Error('Cannot delete unit that is assigned to items')
    }

    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', unitId)

    if (error) throw error
    return true
  }

  // Categories - NEW
  async getCategories(companyId) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('category_name')

    if (error) throw error
    return data
  }

  async createCategory(companyId, categoryData) {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ ...categoryData, company_id: companyId, is_active: true }])
      .select()

    if (error) throw error
    return data[0]
  }

  async updateCategory(categoryId, categoryData) {
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', categoryId)
      .select()

    if (error) throw error
    return data[0]
  }

  async deleteCategory(categoryId) {
    // Check if category is being used
    const { data: usage } = await supabase
      .from('items')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1)

    if (usage?.length > 0) {
      throw new Error('Cannot delete category that has items assigned')
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)

    if (error) throw error
    return true
  }

  async validateCategoryName(companyId, categoryName, excludeId = null) {
    let query = supabase
      .from('categories')
      .select('id')
      .eq('company_id', companyId)
      .eq('category_name', categoryName)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data } = await query
    return data?.length === 0
  }

  // Bank Accounts
  async getBankAccounts(companyId) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('company_id', companyId)
      .order('is_default', { ascending: false })
      .order('account_name')

    if (error) throw error
    return data
  }

  async createBankAccount(companyId, bankAccountData) {
    // If setting as default, remove default from others
    if (bankAccountData.is_default) {
      await supabase
        .from('bank_accounts')
        .update({ is_default: false })
        .eq('company_id', companyId)
    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .insert([{ ...bankAccountData, company_id: companyId }])
      .select()

    if (error) throw error
    return data[0]
  }

  async updateBankAccount(bankAccountId, bankAccountData) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .update(bankAccountData)
      .eq('id', bankAccountId)
      .select()

    if (error) throw error
    return data[0]
  }

  async deleteBankAccount(bankAccountId) {
    // Check if bank account is being used
    const { data: paymentUsage } = await supabase
      .from('payments')
      .select('id')
      .eq('bank_account_id', bankAccountId)
      .limit(1)

    if (paymentUsage?.length > 0) {
      throw new Error('Cannot delete bank account that has payment transactions')
    }

    const { error } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', bankAccountId)

    if (error) throw error
    return true
  }

  // Currencies
  async getCurrencies(companyId) {
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .eq('company_id', companyId)
      .order('is_base_currency', { ascending: false })
      .order('currency_code')

    if (error) throw error
    return data
  }

  async createCurrency(companyId, currencyData) {
    // If setting as base currency, remove base from others
    if (currencyData.is_base_currency) {
      await supabase
        .from('currencies')
        .update({ is_base_currency: false })
        .eq('company_id', companyId)
    }

    const { data, error } = await supabase
      .from('currencies')
      .insert([{ ...currencyData, company_id: companyId }])
      .select()

    if (error) throw error
    return data[0]
  }

  async updateCurrency(currencyId, currencyData) {
    const { data, error } = await supabase
      .from('currencies')
      .update(currencyData)
      .eq('id', currencyId)
      .select()

    if (error) throw error
    return data[0]
  }

  async deleteCurrency(currencyId) {
    // Check if currency is being used
    const { data: salesUsage } = await supabase
      .from('sales_documents')
      .select('id')
      .eq('currency', currencyId)
      .limit(1)

    if (salesUsage?.length > 0) {
      throw new Error('Cannot delete currency that is used in transactions')
    }

    const { error } = await supabase
      .from('currencies')
      .delete()
      .eq('id', currencyId)

    if (error) throw error
    return true
  }

  // Payment Terms
  async getPaymentTerms(companyId) {
    const { data, error } = await supabase
      .from('payment_terms')
      .select('*')
      .eq('company_id', companyId)
      .order('term_days')

    if (error) throw error
    return data
  }

  async createPaymentTerm(companyId, paymentTermData) {
    const { data, error } = await supabase
      .from('payment_terms')
      .insert([{ ...paymentTermData, company_id: companyId }])
      .select()

    if (error) throw error
    return data[0]
  }

  async updatePaymentTerm(paymentTermId, paymentTermData) {
    const { data, error } = await supabase
      .from('payment_terms')
      .update(paymentTermData)
      .eq('id', paymentTermId)
      .select()

    if (error) throw error
    return data[0]
  }

  async deletePaymentTerm(paymentTermId) {
    // Check if payment term is being used
    const { data: customerUsage } = await supabase
      .from('customers')
      .select('id')
      .eq('payment_terms', paymentTermId)
      .limit(1)

    if (customerUsage?.length > 0) {
      throw new Error('Cannot delete payment term that is assigned to customers')
    }

    const { error } = await supabase
      .from('payment_terms')
      .delete()
      .eq('id', paymentTermId)

    if (error) throw error
    return true
  }

  // Utility Methods
  async validateAccountCode(companyId, accountCode, excludeId = null) {
    let query = supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('account_code', accountCode)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data } = await query
    return data?.length === 0
  }

  async validateTaxRateName(companyId, taxName, excludeId = null) {
    let query = supabase
      .from('tax_rates')
      .select('id')
      .eq('company_id', companyId)
      .eq('tax_name', taxName)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data } = await query
    return data?.length === 0
  }

  async validateUnitSymbol(companyId, unitSymbol, excludeId = null) {
    let query = supabase
      .from('units')
      .select('id')
      .eq('company_id', companyId)
      .eq('unit_symbol', unitSymbol)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data } = await query
    return data?.length === 0
  }

  async getMasterDataStats(companyId) {
    const [
      accountsResult,
      taxRatesResult,
      unitsResult,
      categoriesResult,
      bankAccountsResult,
      currenciesResult,
      paymentTermsResult
    ] = await Promise.all([
      supabase.from('chart_of_accounts').select('id, is_active').eq('company_id', companyId),
      supabase.from('tax_rates').select('id, is_active').eq('company_id', companyId),
      supabase.from('units').select('id, is_active').or(`company_id.eq.${companyId},company_id.is.null`),
      supabase.from('categories').select('id, is_active').eq('company_id', companyId),
      supabase.from('bank_accounts').select('id, is_active').eq('company_id', companyId),
      supabase.from('currencies').select('id, is_active').eq('company_id', companyId),
      supabase.from('payment_terms').select('id, is_active').eq('company_id', companyId)
    ])

    return {
      accounts: {
        total: accountsResult.data?.length || 0,
        active: accountsResult.data?.filter(item => item.is_active).length || 0
      },
      taxRates: {
        total: taxRatesResult.data?.length || 0,
        active: taxRatesResult.data?.filter(item => item.is_active).length || 0
      },
      units: {
        total: unitsResult.data?.length || 0,
        active: unitsResult.data?.filter(item => item.is_active).length || 0
      },
      categories: {
        total: categoriesResult.data?.length || 0,
        active: categoriesResult.data?.filter(item => item.is_active).length || 0
      },
      bankAccounts: {
        total: bankAccountsResult.data?.length || 0,
        active: bankAccountsResult.data?.filter(item => item.is_active).length || 0
      },
      currencies: {
        total: currenciesResult.data?.length || 0,
        active: currenciesResult.data?.filter(item => item.is_active).length || 0
      },
      paymentTerms: {
        total: paymentTermsResult.data?.length || 0,
        active: paymentTermsResult.data?.filter(item => item.is_active).length || 0
      }
    }
  }
}

export default new MasterDataService()