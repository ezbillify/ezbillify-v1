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

  // Get all customers for company - OPTIMIZED
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

      const response = await fetch(`/api/customers?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

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

      // Build query for transactions
      let query = supabaseAdmin
        .from('customer_ledger_entries')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)

      // Apply date filters if provided
      if (filters.dateFrom) {
        query = query.gte('entry_date', filters.dateFrom)
      }
      
      if (filters.dateTo) {
        query = query.lte('entry_date', filters.dateTo)
      }

      // Apply transaction type filter if provided
      if (filters.transactionType) {
        query = query.eq('reference_type', filters.transactionType)
      }

      // Order by date
      query = query.order('entry_date', { ascending: true })
        .order('created_at', { ascending: true })

      const { data: transactions, error: transactionsError } = await query

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError)
        return { success: false, data: null, error: 'Failed to fetch transactions' }
      }

      // Calculate summary
      const openingBalance = parseFloat(customer.opening_balance) || 0
      const openingBalanceValue = customer.opening_balance_type === 'debit' ? openingBalance : -openingBalance

      // Calculate totals
      let totalSales = 0
      let totalPayments = 0

      if (transactions) {
        transactions.forEach(transaction => {
          totalSales += parseFloat(transaction.debit_amount) || 0
          totalPayments += parseFloat(transaction.credit_amount) || 0
        })
      }

      const currentBalance = openingBalanceValue + totalSales - totalPayments

      const summary = {
        opening_balance: openingBalanceValue,
        total_sales: totalSales,
        total_payments: totalPayments,
        current_balance: currentBalance,
        credit_limit: parseFloat(customer.credit_limit) || 0,
        available_credit: Math.max(0, (parseFloat(customer.credit_limit) || 0) - Math.abs(currentBalance))
      }

      // Format transactions for display
      const formattedTransactions = transactions ? transactions.map(transaction => {
        // For invoices, we need to get the actual document ID from sales_documents table
        let documentId = transaction.reference_id;
        let documentType = transaction.reference_type;
        
        // If this is a ledger entry referencing an invoice, get the actual sales document ID
        if (transaction.reference_type === 'sales_document' && transaction.reference_id) {
          documentId = transaction.reference_id;
          documentType = 'invoice';
        }
        
        return {
          id: transaction.id,
          date: transaction.entry_date,
          document_number: transaction.reference_number,
          type: documentType,
          description: transaction.description,
          debit: parseFloat(transaction.debit_amount) || 0,
          credit: parseFloat(transaction.credit_amount) || 0,
          balance: parseFloat(transaction.balance) || 0,
          due_date: transaction.due_date,
          // Add the actual document ID for opening in modal
          document_id: documentId
        }
      }) : []

      const result = {
        success: true,
        data: {
          customer,
          transactions: formattedTransactions,
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