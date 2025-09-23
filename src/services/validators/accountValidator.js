import { supabase } from '../utils/supabase'

export const validateAccountData = (accountData) => {
  const errors = {}

  // Required field validation
  if (!accountData.account_code?.trim()) {
    errors.account_code = 'Account code is required'
  }

  if (!accountData.account_name?.trim()) {
    errors.account_name = 'Account name is required'
  }

  if (!accountData.account_type) {
    errors.account_type = 'Account type is required'
  }

  // Account code format validation
  if (accountData.account_code && !/^[A-Z0-9-]+$/.test(accountData.account_code)) {
    errors.account_code = 'Account code should only contain uppercase letters, numbers, and hyphens'
  }

  // Opening balance validation
  if (accountData.opening_balance && isNaN(parseFloat(accountData.opening_balance))) {
    errors.opening_balance = 'Opening balance must be a valid number'
  }

  if (accountData.opening_balance && parseFloat(accountData.opening_balance) < 0) {
    errors.opening_balance = 'Opening balance cannot be negative'
  }

  // Account type validation
  const validAccountTypes = ['asset', 'liability', 'equity', 'income', 'expense', 'cogs']
  if (accountData.account_type && !validAccountTypes.includes(accountData.account_type)) {
    errors.account_type = 'Invalid account type'
  }

  // Opening balance type validation
  const validBalanceTypes = ['debit', 'credit']
  if (accountData.opening_balance_type && !validBalanceTypes.includes(accountData.opening_balance_type)) {
    errors.opening_balance_type = 'Invalid opening balance type'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export const validateAccountCode = async (companyId, accountCode, excludeId = null) => {
  try {
    let query = supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('company_id', companyId)
      .eq('account_code', accountCode)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      isUnique: data?.length === 0,
      message: data?.length > 0 ? 'Account code already exists' : null
    }
  } catch (error) {
    return {
      isUnique: false,
      message: 'Error validating account code'
    }
  }
}

export const validateAccountHierarchy = async (accountId, parentAccountId) => {
  if (!parentAccountId) return { isValid: true }

  try {
    // Check if parent account exists and is not the same as current account
    if (accountId === parentAccountId) {
      return {
        isValid: false,
        message: 'Account cannot be its own parent'
      }
    }

    // Check for circular dependency
    const isCircular = await checkCircularDependency(accountId, parentAccountId)
    if (isCircular) {
      return {
        isValid: false,
        message: 'This would create a circular dependency in the account hierarchy'
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      message: 'Error validating account hierarchy'
    }
  }
}

const checkCircularDependency = async (accountId, parentAccountId) => {
  let currentParentId = parentAccountId
  const visited = new Set()

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      return true // Circular dependency detected
    }

    if (currentParentId === accountId) {
      return true // Would create circular dependency
    }

    visited.add(currentParentId)

    const { data } = await supabase
      .from('chart_of_accounts')
      .select('parent_account_id')
      .eq('id', currentParentId)
      .single()

    currentParentId = data?.parent_account_id
  }

  return false
}

export const validateAccountDeletion = async (accountId) => {
  try {
    // Check if account has transactions
    const { data: transactions } = await supabase
      .from('journal_entry_items')
      .select('id')
      .eq('account_id', accountId)
      .limit(1)

    if (transactions?.length > 0) {
      return {
        canDelete: false,
        message: 'Cannot delete account that has transactions'
      }
    }

    // Check if account has child accounts
    const { data: children } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('parent_account_id', accountId)
      .limit(1)

    if (children?.length > 0) {
      return {
        canDelete: false,
        message: 'Cannot delete account that has child accounts'
      }
    }

    return {
      canDelete: true,
      message: null
    }
  } catch (error) {
    return {
      canDelete: false,
      message: 'Error validating account deletion'
    }
  }
}

export const sanitizeAccountData = (accountData) => {
  return {
    account_code: accountData.account_code?.trim().toUpperCase(),
    account_name: accountData.account_name?.trim(),
    account_type: accountData.account_type,
    account_subtype: accountData.account_subtype || null,
    parent_account_id: accountData.parent_account_id || null,
    opening_balance: parseFloat(accountData.opening_balance) || 0,
    opening_balance_type: accountData.opening_balance_type || 'debit',
    description: accountData.description?.trim() || null,
    is_active: accountData.is_active !== undefined ? accountData.is_active : true
  }
}