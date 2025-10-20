// src/services/companyService.js
import { supabase, dbHelpers, handleSupabaseError } from './utils/supabase'

class CompanyService {
  // Create a new company AND auto-create default branch
  async createCompany(companyData) {
    try {
      // 1. Create the company
      const { data: company, error: companyError } = await dbHelpers.createCompany(companyData)
      
      if (companyError) {
        throw new Error(handleSupabaseError(companyError))
      }

      // 2. Auto-create default "Main Branch" for this company
      try {
        const { data: branch, error: branchError } = await supabase
          .from('branches')
          .insert([
            {
              company_id: company.id,
              name: 'Main Branch',
              document_prefix: 'MB',
              is_default: true,
              is_active: true,
              document_number_counter: 1,
              address: {},
              billing_address: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single()

        if (branchError) {
          console.error('Branch creation error:', branchError)
          console.warn(`Warning: Default branch not created for company ${company.id}, but company was created successfully`)
        }

        return { 
          success: true, 
          data: {
            company,
            branch: branch || null
          }, 
          error: null,
          message: 'Company created successfully with default branch'
        }
      } catch (branchError) {
        console.error('Unexpected error creating default branch:', branchError)
        // Return success anyway - company is created, branch can be added manually
        return { 
          success: true, 
          data: { company, branch: null }, 
          error: null,
          message: 'Company created successfully (branch creation had issues but can be added manually)'
        }
      }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Get company by ID
  async getCompany(companyId) {
    try {
      const { data, error } = await dbHelpers.getCompany(companyId)
      
      if (error) {
        throw new Error(handleSupabaseError(error))
      }
      
      return { success: true, data, error: null }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Update company
  async updateCompany(companyId, updates) {
    try {
      const { data, error } = await dbHelpers.updateCompany(companyId, {
        ...updates,
        updated_at: new Date().toISOString()
      })
      
      if (error) {
        throw new Error(handleSupabaseError(error))
      }
      
      return { success: true, data, error: null }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Get company settings
  async getCompanySettings(companyId) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_public', false)
      
      if (error) {
        throw new Error(handleSupabaseError(error))
      }
      
      // Convert array to key-value object
      const settings = {}
      data?.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value
      })
      
      return { success: true, data: settings, error: null }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Update company settings
  async updateCompanySettings(companyId, settings) {
    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        company_id: companyId,
        setting_key: key,
        setting_value: value,
        setting_type: typeof value,
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await supabase
        .from('system_settings')
        .upsert(settingsArray, { 
          onConflict: 'company_id,setting_key',
          returning: 'minimal' 
        })
      
      if (error) {
        throw new Error(handleSupabaseError(error))
      }
      
      return { success: true, data, error: null }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Get company financial year settings
  async getFinancialYear(companyId) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('financial_year_start')
        .eq('id', companyId)
        .single()
      
      if (error) {
        throw new Error(handleSupabaseError(error))
      }
      
      const fyStart = new Date(data.financial_year_start)
      const currentDate = new Date()
      
      // Determine current financial year
      let fyStartYear = fyStart.getFullYear()
      if (currentDate < new Date(fyStartYear, fyStart.getMonth(), fyStart.getDate())) {
        fyStartYear -= 1
      }
      
      const currentFyStart = new Date(fyStartYear, fyStart.getMonth(), fyStart.getDate())
      const currentFyEnd = new Date(fyStartYear + 1, fyStart.getMonth(), fyStart.getDate() - 1)
      
      return {
        success: true,
        data: {
          financial_year_start: data.financial_year_start,
          current_fy_start: currentFyStart.toISOString().split('T')[0],
          current_fy_end: currentFyEnd.toISOString().split('T')[0],
          current_fy_label: `${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`
        },
        error: null
      }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Validate GSTIN
  async validateGSTIN(gstin) {
    try {
      // Basic format validation
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      
      if (!gstinRegex.test(gstin)) {
        return { 
          success: false, 
          data: { isValid: false, message: 'Invalid GSTIN format' }, 
          error: null 
        }
      }

      // Check if GSTIN already exists in database
      const { data: existingCompany, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('gstin', gstin)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(handleSupabaseError(error))
      }

      if (existingCompany) {
        return {
          success: false,
          data: { 
            isValid: false, 
            message: `GSTIN already registered with ${existingCompany.name}` 
          },
          error: null
        }
      }

      return {
        success: true,
        data: { 
          isValid: true, 
          message: 'GSTIN is valid and available',
          state_code: gstin.substring(0, 2),
          pan: gstin.substring(2, 12)
        },
        error: null
      }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Get company statistics
  async getCompanyStats(companyId) {
    try {
      const [salesResult, purchaseResult, customerResult, vendorResult] = await Promise.all([
        // Total sales this month
        supabase
          .from('sales_documents')
          .select('total_amount')
          .eq('company_id', companyId)
          .eq('document_type', 'invoice')
          .eq('status', 'approved')
          .gte('document_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),

        // Total purchases this month  
        supabase
          .from('purchase_documents')
          .select('total_amount')
          .eq('company_id', companyId)
          .eq('document_type', 'bill')
          .eq('status', 'approved')
          .gte('document_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),

        // Customer count
        supabase
          .from('customers')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('status', 'active'),

        // Vendor count
        supabase
          .from('vendors')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('status', 'active')
      ])

      const totalSales = salesResult.data?.reduce((sum, doc) => sum + parseFloat(doc.total_amount || 0), 0) || 0
      const totalPurchases = purchaseResult.data?.reduce((sum, doc) => sum + parseFloat(doc.total_amount || 0), 0) || 0

      return {
        success: true,
        data: {
          monthly_sales: totalSales,
          monthly_purchases: totalPurchases,
          total_customers: customerResult.count || 0,
          total_vendors: vendorResult.count || 0,
          net_profit: totalSales - totalPurchases
        },
        error: null
      }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Initialize company default data
  async initializeCompanyDefaults(companyId) {
    try {
      // Create default tax rates
      const defaultTaxRates = [
        { tax_name: 'GST 0%', tax_type: 'gst', tax_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0 },
        { tax_name: 'GST 5%', tax_type: 'gst', tax_rate: 5, cgst_rate: 2.5, sgst_rate: 2.5, igst_rate: 5 },
        { tax_name: 'GST 12%', tax_type: 'gst', tax_rate: 12, cgst_rate: 6, sgst_rate: 6, igst_rate: 12 },
        { tax_name: 'GST 18%', tax_type: 'gst', tax_rate: 18, cgst_rate: 9, sgst_rate: 9, igst_rate: 18, is_default: true },
        { tax_name: 'GST 28%', tax_type: 'gst', tax_rate: 28, cgst_rate: 14, sgst_rate: 14, igst_rate: 28 }
      ]

      const taxRatesWithCompany = defaultTaxRates.map(rate => ({
        ...rate,
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Create default payment terms
      const defaultPaymentTerms = [
        { term_name: 'Immediate', term_days: 0 },
        { term_name: 'Net 15', term_days: 15 },
        { term_name: 'Net 30', term_days: 30 },
        { term_name: 'Net 45', term_days: 45 },
        { term_name: 'Net 60', term_days: 60 }
      ]

      const paymentTermsWithCompany = defaultPaymentTerms.map(term => ({
        ...term,
        company_id: companyId,
        created_at: new Date().toISOString()
      }))

      // Create default chart of accounts (basic structure)
      const defaultAccounts = [
        { account_code: '1000', account_name: 'Cash', account_type: 'Asset', is_system_account: true },
        { account_code: '1100', account_name: 'Accounts Receivable', account_type: 'Asset', is_system_account: true },
        { account_code: '1200', account_name: 'Inventory', account_type: 'Asset', is_system_account: true },
        { account_code: '2000', account_name: 'Accounts Payable', account_type: 'Liability', is_system_account: true },
        { account_code: '3000', account_name: 'Equity', account_type: 'Equity', is_system_account: true },
        { account_code: '4000', account_name: 'Sales Revenue', account_type: 'Income', is_system_account: true },
        { account_code: '5000', account_name: 'Cost of Goods Sold', account_type: 'Expense', is_system_account: true },
        { account_code: '6000', account_name: 'Operating Expenses', account_type: 'Expense', is_system_account: true }
      ]

      const accountsWithCompany = defaultAccounts.map(account => ({
        ...account,
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Insert all default data
      await Promise.all([
        supabase.from('tax_rates').insert(taxRatesWithCompany),
        supabase.from('payment_terms').insert(paymentTermsWithCompany),
        supabase.from('chart_of_accounts').insert(accountsWithCompany)
      ])

      return { success: true, data: 'Company defaults initialized', error: null }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }
}

// Export singleton instance
const companyService = new CompanyService()
export default companyService