// src/services/customerService.js - OPTIMIZED FOR SPEED
import { supabase, supabaseAdmin, handleSupabaseError } from './utils/supabase'

// Simple in-memory cache for ledger (5 min TTL)
const ledgerCache = new Map()

class CustomerService {
  // Create new customer
  async createCustomer(customerData, companyId) {
    try {
      if (!customerData.customer_code) {
        const { data: lastCustomer } = await supabase
          .from('customers')
          .select('customer_code')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const lastCode = lastCustomer?.customer_code || 'CUST0000'
        const lastNumber = parseInt(lastCode.replace('CUST', '')) || 0
        customerData.customer_code = `CUST${String(lastNumber + 1).padStart(4, '0')}`
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([{
          ...customerData,
          company_id: companyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        throw new Error(handleSupabaseError(error))
      }

      return { success: true, data, error: null }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Get customer by ID
  async getCustomer(customerId, companyId) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .single()

      if (error) {
        throw new Error(handleSupabaseError(error))
      }

      return { success: true, data, error: null }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Get all customers for company - OPTIMIZED FOR VERCEL
  async getCustomers(companyId, { page = 1, limit = 20, search = '', type = null, status = 'active' } = {}) {
    try {
      const params = new URLSearchParams({
        company_id: companyId,
        page: page.toString(),
        limit: limit.toString()
      })

      if (search) params.append('search', search)
      if (type) params.append('customer_type', type)
      if (status) params.append('status', status)

      let token = null;
      try {
        const storedAuth = localStorage.getItem('sb-ixpyiekxeijrshfmczoi-auth-token');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          token = authData.access_token;
        }
      } catch (e) {
        console.log('Could not retrieve auth token from localStorage');
      }

      if (!token) {
        try {
          const storedSession = sessionStorage.getItem('sb-ixpyiekxeijrshfmczoi-auth-token');
          if (storedSession) {
            const sessionData = JSON.parse(storedSession);
            token = sessionData.access_token;
          }
        } catch (e) {
          console.log('Could not retrieve auth token from sessionStorage');
        }
      }

      // Add timeout for Vercel deployment
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`/api/customers?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // ✅ OPTIMIZED: Don't fetch ledger for list (too slow)
        // Ledger is calculated on detail page only
        return {
          success: true,
          data: {
            customers: result.data || [],
            total: result.pagination?.total_records || 0,
            page: result.pagination?.current_page || page,
            limit: result.pagination?.per_page || limit,
            totalPages: result.pagination?.total_pages || Math.ceil((result.pagination?.total_records || 0) / limit)
          },
          error: null
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      // Handle timeout errors specifically
      if (error.name === 'AbortError') {
        return { success: false, data: null, error: 'Request timeout. Please try again.' }
      }
      return { success: false, data: null, error: error.message }
    }
  }

  // Update customer
  async updateCustomer(customerId, customerData, companyId) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          ...customerData,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .eq('company_id', companyId)
        .select()
        .single()

      if (error) {
        throw new Error(handleSupabaseError(error))
      }

      // Clear ledger cache on update
      this.clearLedgerCache(customerId, companyId)

      return { success: true, data, error: null }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Delete customer (soft delete)
  async deleteCustomer(customerId, companyId) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .eq('company_id', companyId)
        .select()
        .single()

      if (error) {
        throw new Error(handleSupabaseError(error))
      }

      return { success: true, data, error: null }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Validate GSTIN
  async validateGSTIN(gstin, excludeCustomerId = null, companyId) {
    try {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      
      if (!gstinRegex.test(gstin)) {
        return { 
          success: false, 
          data: { isValid: false, message: 'Invalid GSTIN format' }, 
          error: null 
        }
      }

      let query = supabase
        .from('customers')
        .select('id, name, customer_code')
        .eq('gstin', gstin)
        .eq('company_id', companyId)

      if (excludeCustomerId) {
        query = query.neq('id', excludeCustomerId)
      }

      const { data: existingCustomer, error } = await query.single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(handleSupabaseError(error))
      }

      if (existingCustomer) {
        return {
          success: false,
          data: { 
            isValid: false, 
            message: `GSTIN already exists for customer ${existingCustomer.name} (${existingCustomer.customer_code})` 
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

  // Get customer statistics
  async getCustomerStats(companyId) {
    try {
      const [totalResult, b2bResult, b2cResult, activeResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId),

        supabase
          .from('customers')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('customer_type', 'b2b'),

        supabase
          .from('customers')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('customer_type', 'b2c'),

        supabase
          .from('customers')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('status', 'active')
      ])

      return {
        success: true,
        data: {
          total: totalResult.count || 0,
          b2b: b2bResult.count || 0,
          b2c: b2cResult.count || 0,
          active: activeResult.count || 0,
          inactive: (totalResult.count || 0) - (activeResult.count || 0)
        },
        error: null
      }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }

  // Search customers for autocomplete - OPTIMIZED FOR SPEED
  async searchCustomers(companyId, searchTerm, limit = 10) {
    try {
      // Optimized query - only fetch essential fields for dropdowns
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, customer_code, customer_type')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .or(`name.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })
        .limit(limit)

      if (error) {
        throw new Error(handleSupabaseError(error))
      }

      return { success: true, data: data || [], error: null }
    } catch (error) {
      return { success: false, data: [], error: error.message }
    }
  }

  // ============================================
  // OPTIMIZED LEDGER CALCULATION (FAST)
  // ============================================
  async getCustomerLedger(customerId, companyId, filters = {}) {
    try {
      const cacheKey = `${customerId}-${companyId}`

      // ✅ CHECK CACHE FIRST
      if (ledgerCache.has(cacheKey) && !filters.dateFrom && !filters.dateTo) {
        const cached = ledgerCache.get(cacheKey)
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 min cache
          console.log(`📦 Ledger cache HIT for ${customerId}`)
          return cached.data
        }
      }

      // ✅ FAST METHOD 1: Get latest ledger entry (if exists)
      const { data: latestLedger } = await supabaseAdmin
        .from('customer_ledger_entries')
        .select('balance, entry_date, debit_amount, credit_amount')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Get customer info (needed for opening balance)
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('id, name, opening_balance, opening_balance_type, credit_limit')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .single()

      if (customerError || !customer) {
        return { success: false, data: null, error: 'Customer not found' }
      }

      // If we have ledger entry, use it (fastest)
      if (latestLedger) {
        console.log(`✅ Using ledger entry for ${customerId}`)

        const openingBalance = parseFloat(customer.opening_balance) || 0
        const openingBalanceValue = customer.opening_balance_type === 'debit' ? openingBalance : -openingBalance

        const summary = {
          opening_balance: openingBalanceValue,
          current_balance: parseFloat(latestLedger.balance) || 0,
          credit_limit: parseFloat(customer.credit_limit) || 0,
          available_credit: Math.max(0, (parseFloat(customer.credit_limit) || 0) - Math.abs(parseFloat(latestLedger.balance) || 0))
        }

        const result = {
          success: true,
          data: {
            customer,
            transactions: [],
            summary
          },
          error: null
        }

        // Cache it (only if no date filters)
        if (!filters.dateFrom && !filters.dateTo) {
          ledgerCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          })
        }

        return result
      }

      // ✅ FAST METHOD 2: Calculate from invoices (if no ledger exists)
      console.log(`⚠️ No ledger, calculating from invoices for ${customerId}`)

      const { data: invoices } = await supabaseAdmin
        .from('sales_documents')
        .select('total_amount, paid_amount, balance_amount')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .eq('document_type', 'invoice')

      let totalDue = 0
      if (invoices && invoices.length > 0) {
        invoices.forEach(invoice => {
          const balance = invoice.balance_amount !== null && invoice.balance_amount !== undefined
            ? parseFloat(invoice.balance_amount)
            : (parseFloat(invoice.total_amount) || 0) - (parseFloat(invoice.paid_amount) || 0)
          totalDue += balance
        })
      }

      const openingBalance = parseFloat(customer.opening_balance) || 0
      const openingBalanceValue = customer.opening_balance_type === 'debit' ? openingBalance : -openingBalance
      const currentBalance = openingBalanceValue + totalDue

      const summary = {
        opening_balance: openingBalanceValue,
        total_sales: totalDue,
        current_balance: currentBalance,
        credit_limit: parseFloat(customer.credit_limit) || 0,
        available_credit: Math.max(0, (parseFloat(customer.credit_limit) || 0) - Math.abs(currentBalance))
      }

      const result = {
        success: true,
        data: {
          customer,
          transactions: [],
          summary
        },
        error: null
      }

      // Cache it (only if no date filters)
      if (!filters.dateFrom && !filters.dateTo) {
        ledgerCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        })
      }

      return result
    } catch (error) {
      console.error('Error in getCustomerLedger:', error);
      return { success: false, data: null, error: error.message }
    }
  }

  // Clear ledger cache
  clearLedgerCache(customerId, companyId) {
    const cacheKey = `${customerId}-${companyId}`
    if (ledgerCache.has(cacheKey)) {
      ledgerCache.delete(cacheKey)
      console.log(`🗑️ Cleared ledger cache for ${customerId}`)
    }
  }

  // Clear all cache
  clearAllCache() {
    ledgerCache.clear()
    console.log(`🗑️ Cleared all ledger cache`)
  }
}

// Export singleton instance
const customerService = new CustomerService()
export default customerService