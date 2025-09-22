// src/services/customerService.js
import { supabase, handleSupabaseError } from './utils/supabase'

class CustomerService {
  // Create new customer
  async createCustomer(customerData, companyId) {
    try {
      // Generate customer code if not provided
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

  // Get all customers for company
  async getCustomers(companyId, { page = 1, limit = 20, search = '', type = '', status = 'active' } = {}) {
    try {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)

      // Add filters
      if (status) {
        query = query.eq('status', status)
      }

      if (type) {
        query = query.eq('customer_type', type)
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,customer_code.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      // Add pagination
      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        throw new Error(handleSupabaseError(error))
      }

      return {
        success: true,
        data: {
          customers: data || [],
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        },
        error: null
      }
    } catch (error) {
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
      // Basic format validation
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      
      if (!gstinRegex.test(gstin)) {
        return { 
          success: false, 
          data: { isValid: false, message: 'Invalid GSTIN format' }, 
          error: null 
        }
      }

      // Check if GSTIN already exists
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
        // Total customers
        supabase
          .from('customers')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId),

        // B2B customers
        supabase
          .from('customers')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('customer_type', 'b2b'),

        // B2C customers
        supabase
          .from('customers')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .eq('customer_type', 'b2c'),

        // Active customers
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

  // Search customers for autocomplete
  async searchCustomers(companyId, searchTerm, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, customer_code, customer_type, email, phone')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .or(`name.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
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

  // Get customer ledger with real transactions
  async getCustomerLedger(customerId, companyId, filters = {}) {
    try {
      // Get customer info
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .single()

      if (customerError) {
        throw new Error(handleSupabaseError(customerError))
      }

      // Build query for sales documents (invoices, quotes, etc.)
      let salesQuery = supabase
        .from('sales_documents')
        .select('id, document_type, document_number, document_date, due_date, total_amount, paid_amount, status, created_at')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)

      // Build query for payments
      let paymentsQuery = supabase
        .from('payments')
        .select('id, payment_type, payment_number, payment_date, amount, status, created_at')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)

      // Apply date filters if provided
      if (filters.dateFrom) {
        salesQuery = salesQuery.gte('document_date', filters.dateFrom)
        paymentsQuery = paymentsQuery.gte('payment_date', filters.dateFrom)
      }
      if (filters.dateTo) {
        salesQuery = salesQuery.lte('document_date', filters.dateTo)
        paymentsQuery = paymentsQuery.lte('payment_date', filters.dateTo)
      }

      // Execute queries
      const [salesResult, paymentsResult] = await Promise.all([
        salesQuery.order('document_date', { ascending: false }),
        paymentsQuery.order('payment_date', { ascending: false })
      ])

      if (salesResult.error) {
        throw new Error(handleSupabaseError(salesResult.error))
      }
      if (paymentsResult.error) {
        throw new Error(handleSupabaseError(paymentsResult.error))
      }

      // Process sales documents into transactions
      const salesTransactions = (salesResult.data || []).map(doc => ({
        id: doc.id,
        date: doc.document_date,
        type: doc.document_type,
        document_number: doc.document_number,
        description: `${doc.document_type.charAt(0).toUpperCase() + doc.document_type.slice(1)}`,
        debit: parseFloat(doc.total_amount) || 0,
        credit: 0,
        status: doc.status,
        due_date: doc.due_date,
        created_at: doc.created_at
      }))

      // Process payments into transactions
      const paymentTransactions = (paymentsResult.data || []).map(payment => ({
        id: payment.id,
        date: payment.payment_date,
        type: 'payment',
        document_number: payment.payment_number,
        description: 'Payment received',
        debit: 0,
        credit: parseFloat(payment.amount) || 0,
        status: payment.status,
        created_at: payment.created_at
      }))

      // Combine and sort all transactions
      const allTransactions = [...salesTransactions, ...paymentTransactions]
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      // Calculate running balance
      let runningBalance = parseFloat(customer.opening_balance) || 0
      const transactionsWithBalance = allTransactions.map(transaction => {
        runningBalance += transaction.debit - transaction.credit
        return {
          ...transaction,
          balance: runningBalance
        }
      })

      // Apply additional filters
      let filteredTransactions = transactionsWithBalance
      
      if (filters.transactionType) {
        filteredTransactions = filteredTransactions.filter(t => t.type === filters.transactionType)
      }
      if (filters.status) {
        filteredTransactions = filteredTransactions.filter(t => t.status === filters.status)
      }

      // Calculate summary
      const totalSales = salesTransactions.reduce((sum, t) => sum + t.debit, 0)
      const totalPayments = paymentTransactions.reduce((sum, t) => sum + t.credit, 0)
      const currentBalance = (parseFloat(customer.opening_balance) || 0) + totalSales - totalPayments

      // Calculate overdue amount (invoices past due date)
      const today = new Date().toISOString().split('T')[0]
      const overdueAmount = salesTransactions
        .filter(t => t.type === 'invoice' && t.due_date && t.due_date < today && t.status !== 'paid')
        .reduce((sum, t) => sum + t.debit, 0)

      const summary = {
        opening_balance: parseFloat(customer.opening_balance) || 0,
        total_sales: totalSales,
        total_payments: totalPayments,
        current_balance: currentBalance,
        overdue_amount: overdueAmount,
        credit_limit: parseFloat(customer.credit_limit) || 0,
        available_credit: (parseFloat(customer.credit_limit) || 0) - currentBalance
      }

      return {
        success: true,
        data: {
          customer,
          transactions: filteredTransactions.reverse(), // Show newest first
          summary
        },
        error: null
      }
    } catch (error) {
      return { success: false, data: null, error: error.message }
    }
  }
}

// Export singleton instance
const customerService = new CustomerService()
export default customerService