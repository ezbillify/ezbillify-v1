// src/context/CompanyContext.js
import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { dbHelpers, storageHelpers, handleSupabaseError } from '../services/utils/supabase'

const CompanyContext = createContext({})

export const useCompany = () => {
  const context = useContext(CompanyContext)
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}

export const CompanyProvider = ({ children }) => {
  const { user, company: authCompany, isAuthenticated } = useAuth()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({})
  const [taxRates, setTaxRates] = useState([])
  const [units, setUnits] = useState([])
  const [chartOfAccounts, setChartOfAccounts] = useState([])

  // Initialize company data when auth company changes
  useEffect(() => {
    if (authCompany) {
      setCompany(authCompany)
      loadCompanyData(authCompany.id)
    } else {
      setCompany(null)
      setSettings({})
      setTaxRates([])
      setUnits([])
      setChartOfAccounts([])
    }
  }, [authCompany])

  // Load all company-related data
  const loadCompanyData = async (companyId) => {
    if (!companyId) return

    setLoading(true)
    try {
      await Promise.all([
        loadCompanySettings(companyId),
        loadTaxRates(companyId),
        loadUnits(companyId),
        loadChartOfAccounts(companyId)
      ])
    } catch (error) {
      console.error('Error loading company data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load company settings
  const loadCompanySettings = async (companyId) => {
    try {
      const { data, error } = await dbHelpers.getCompanySettings(companyId)
      if (error) {
        console.error('Error loading company settings:', error)
        return
      }
      setSettings(data || {})
    } catch (error) {
      console.error('Error loading company settings:', error)
    }
  }

  // Load tax rates
  const loadTaxRates = async (companyId) => {
    try {
      const { data, error } = await dbHelpers.getTaxRates(companyId)
      if (error) {
        console.error('Error loading tax rates:', error)
        return
      }
      setTaxRates(data || [])
    } catch (error) {
      console.error('Error loading tax rates:', error)
    }
  }

  // Load units
  const loadUnits = async (companyId) => {
    try {
      const { data, error } = await dbHelpers.getUnits(companyId)
      if (error) {
        console.error('Error loading units:', error)
        return
      }
      setUnits(data || [])
    } catch (error) {
      console.error('Error loading units:', error)
    }
  }

  // Load chart of accounts
  const loadChartOfAccounts = async (companyId) => {
    try {
      const { data, error } = await dbHelpers.getChartOfAccounts(companyId)
      if (error) {
        console.error('Error loading chart of accounts:', error)
        return
      }
      setChartOfAccounts(data || [])
    } catch (error) {
      console.error('Error loading chart of accounts:', error)
    }
  }

  // Update company information
  const updateCompany = async (updates) => {
    if (!company?.id) {
      return { error: 'No company found' }
    }

    try {
      setLoading(true)
      const { data, error } = await dbHelpers.updateCompany(company.id, updates)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setCompany(data)
      return { success: true, company: data }
    } catch (error) {
      return { error: 'Failed to update company' }
    } finally {
      setLoading(false)
    }
  }

  // Upload company logo
  const uploadLogo = async (logoFile) => {
    if (!company?.id) {
      return { error: 'No company found' }
    }

    try {
      setLoading(true)
      const { data, error } = await storageHelpers.uploadLogo(company.id, logoFile)

      if (error) {
        return { error: 'Failed to upload logo' }
      }

      // Update company with new logo URL
      const updateResult = await updateCompany({ logo_url: data.publicUrl })
      if (updateResult.error) {
        return updateResult
      }

      return { success: true, logoUrl: data.publicUrl }
    } catch (error) {
      return { error: 'Failed to upload logo' }
    } finally {
      setLoading(false)
    }
  }

  // Upload company letterhead
  const uploadLetterhead = async (letterheadFile) => {
    if (!company?.id) {
      return { error: 'No company found' }
    }

    try {
      setLoading(true)
      const { data, error } = await storageHelpers.uploadLetterhead(company.id, letterheadFile)

      if (error) {
        return { error: 'Failed to upload letterhead' }
      }

      // Update company with new letterhead URL
      const updateResult = await updateCompany({ letterhead_url: data.publicUrl })
      if (updateResult.error) {
        return updateResult
      }

      return { success: true, letterheadUrl: data.publicUrl }
    } catch (error) {
      return { error: 'Failed to upload letterhead' }
    } finally {
      setLoading(false)
    }
  }

  // Update company setting
  const updateSetting = async (settingKey, settingValue) => {
    if (!company?.id) {
      return { error: 'No company found' }
    }

    try {
      const { data, error } = await dbHelpers.updateCompanySettings(
        company.id,
        settingKey,
        settingValue
      )

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setSettings(prev => ({
        ...prev,
        [settingKey]: settingValue
      }))

      return { success: true }
    } catch (error) {
      return { error: 'Failed to update setting' }
    }
  }

  // Create tax rate
  const createTaxRate = async (taxRateData) => {
    if (!company?.id) {
      return { error: 'No company found' }
    }

    try {
      const { data, error } = await dbHelpers.createTaxRate({
        ...taxRateData,
        company_id: company.id
      })

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setTaxRates(prev => [...prev, data])
      return { success: true, taxRate: data }
    } catch (error) {
      return { error: 'Failed to create tax rate' }
    }
  }

  // Update tax rate
  const updateTaxRate = async (taxRateId, updates) => {
    try {
      const { data, error } = await dbHelpers.updateTaxRate(taxRateId, updates)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setTaxRates(prev => 
        prev.map(rate => rate.id === taxRateId ? data : rate)
      )

      return { success: true, taxRate: data }
    } catch (error) {
      return { error: 'Failed to update tax rate' }
    }
  }

  // Delete tax rate
  const deleteTaxRate = async (taxRateId) => {
    try {
      const { error } = await dbHelpers.deleteTaxRate(taxRateId)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setTaxRates(prev => prev.filter(rate => rate.id !== taxRateId))
      return { success: true }
    } catch (error) {
      return { error: 'Failed to delete tax rate' }
    }
  }

  // Create unit
  const createUnit = async (unitData) => {
    if (!company?.id) {
      return { error: 'No company found' }
    }

    try {
      const { data, error } = await dbHelpers.createUnit({
        ...unitData,
        company_id: company.id
      })

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setUnits(prev => [...prev, data])
      return { success: true, unit: data }
    } catch (error) {
      return { error: 'Failed to create unit' }
    }
  }

  // Update unit
  const updateUnit = async (unitId, updates) => {
    try {
      const { data, error } = await dbHelpers.updateUnit(unitId, updates)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setUnits(prev => 
        prev.map(unit => unit.id === unitId ? data : unit)
      )

      return { success: true, unit: data }
    } catch (error) {
      return { error: 'Failed to update unit' }
    }
  }

  // Delete unit
  const deleteUnit = async (unitId) => {
    try {
      const { error } = await dbHelpers.deleteUnit(unitId)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setUnits(prev => prev.filter(unit => unit.id !== unitId))
      return { success: true }
    } catch (error) {
      return { error: 'Failed to delete unit' }
    }
  }

  // Create account
  const createAccount = async (accountData) => {
    if (!company?.id) {
      return { error: 'No company found' }
    }

    try {
      const { data, error } = await dbHelpers.createAccount({
        ...accountData,
        company_id: company.id
      })

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setChartOfAccounts(prev => [...prev, data])
      return { success: true, account: data }
    } catch (error) {
      return { error: 'Failed to create account' }
    }
  }

  // Update account
  const updateAccount = async (accountId, updates) => {
    try {
      const { data, error } = await dbHelpers.updateAccount(accountId, updates)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setChartOfAccounts(prev => 
        prev.map(account => account.id === accountId ? data : account)
      )

      return { success: true, account: data }
    } catch (error) {
      return { error: 'Failed to update account' }
    }
  }

  // Delete account
  const deleteAccount = async (accountId) => {
    try {
      const { error } = await dbHelpers.deleteAccount(accountId)

      if (error) {
        return { error: handleSupabaseError(error) }
      }

      setChartOfAccounts(prev => prev.filter(account => account.id !== accountId))
      return { success: true }
    } catch (error) {
      return { error: 'Failed to delete account' }
    }
  }

  // Helper functions
  const getActiveTaxRates = () => {
    return taxRates.filter(rate => rate.is_active)
  }

  const getActiveUnits = () => {
    return units.filter(unit => unit.is_active)
  }

  const getAccountsByType = (accountType) => {
    return chartOfAccounts.filter(account => 
      account.account_type === accountType && account.is_active
    )
  }

  const getDefaultTaxRate = () => {
    return taxRates.find(rate => rate.is_default && rate.is_active)
  }

  const getSetting = (key, defaultValue = null) => {
    return settings[key] || defaultValue
  }

  const value = {
    // State
    company,
    loading,
    settings,
    taxRates,
    units,
    chartOfAccounts,

    // Company operations
    updateCompany,
    uploadLogo,
    uploadLetterhead,

    // Settings
    updateSetting,
    getSetting,

    // Tax rates
    createTaxRate,
    updateTaxRate,
    deleteTaxRate,
    getActiveTaxRates,
    getDefaultTaxRate,

    // Units
    createUnit,
    updateUnit,
    deleteUnit,
    getActiveUnits,

    // Chart of accounts
    createAccount,
    updateAccount,
    deleteAccount,
    getAccountsByType,

    // Refresh data
    refreshCompanyData: () => loadCompanyData(company?.id),
  }

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
}

export default CompanyContext
