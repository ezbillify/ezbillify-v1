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
      // Use direct Supabase query for single customer (simpler)
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

  // Get all customers for company - MODIFIED to use API
  async getCustomers(companyId, { page = 1, limit = 20, search = '', type = null, status = 'active' } = {}) {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        company_id: companyId,
        page: page.toString(),
        limit: limit.toString()
      })

      // Add optional parameters
      if (search) params.append('search', search)
      if (type) params.append('customer_type', type)
      if (status) params.append('status', status)

      // Try to get auth token from localStorage (similar to how useAuth works)
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

      // If no token in localStorage, try to get it from session storage
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

      // Make authenticated request to API
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
        // Enhance customers with ledger data
        const enhancedCustomers = await Promise.all(
          (result.data || []).map(async (customer) => {
            try {
              // Get ledger data for each customer
              const ledgerResult = await this.getCustomerLedger(customer.id, companyId);
              if (ledgerResult.success) {
                return {
                  ...customer,
                  current_balance: ledgerResult.data.summary?.current_balance || 0,
                  advance_amount: ledgerResult.data.summary?.total_payments - ledgerResult.data.summary?.total_sales || 0
                };
              }
              return customer;
            } catch (error) {
              console.error(`Error fetching ledger for customer ${customer.id}:`, error);
              return customer;
            }
          })
        );

        return {
          success: true,
          data: {
            customers: enhancedCustomers,
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
        console.error('Error fetching customer:', customerError);
        return { success: false, data: null, error: handleSupabaseError(customerError) }
      }
      
      console.log('Customer data:', customer);
      console.log('Customer opening balance:', {
        amount: customer.opening_balance,
        type: customer.opening_balance_type
      });

      // Try to get ledger entries first (most accurate method)
      let ledgerQuery = supabase
        .from('customer_ledger_entries')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)

      // Apply date filters if provided
      if (filters.dateFrom) {
        ledgerQuery = ledgerQuery.gte('entry_date', filters.dateFrom)
      }
      if (filters.dateTo) {
        ledgerQuery = ledgerQuery.lte('entry_date', filters.dateTo)
      }

      const { data: ledgerEntries, error: ledgerError } = await ledgerQuery
        .order('entry_date', { ascending: true })
        .order('created_at', { ascending: true })
        
      console.log('Ledger entries query result:', { ledgerEntries, ledgerError });

      // If we have ledger entries, use them (preferred method)
      if (!ledgerError && ledgerEntries && ledgerEntries.length > 0) {
        console.log('Using ledger entries for calculation');
        
        // Convert ledger entries to transaction format
        const transactions = ledgerEntries.map(entry => ({
          id: entry.id,
          date: entry.entry_date,
          type: entry.entry_type,
          document_number: entry.reference_number,
          description: entry.description || `${entry.entry_type} entry`,
          debit: parseFloat(entry.debit_amount) || 0,
          credit: parseFloat(entry.credit_amount) || 0,
          balance: parseFloat(entry.balance) || 0,
          reference_type: entry.reference_type,
          reference_id: entry.reference_id
        }));

        console.log('Processed transactions:', transactions);

        // Apply additional filters
        let filteredTransactions = [...transactions];
        
        if (filters.transactionType) {
          filteredTransactions = filteredTransactions.filter(t => t.type === filters.transactionType);
        }

        // Calculate summary from ledger entries
        const openingBalance = parseFloat(customer.opening_balance) || 0;
        // If opening balance is debit type, customer owes us money (positive)
        // If opening balance is credit type, we owe customer money (negative)
        const openingBalanceValue = customer.opening_balance_type === 'debit' ? openingBalance : -openingBalance;
        
        // Calculate totals from ledger entries
        const totalSales = transactions
          .filter(t => t.type === 'invoice' || t.type === 'opening_balance')
          .reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0);
          
        const totalPayments = transactions
          .filter(t => t.type === 'payment' || t.type === 'advance_payment' || t.type === 'payment_allocation')
          .reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0);
        
        // Current balance = Opening Balance + Total Sales - Total Payments
        const currentBalance = openingBalanceValue + totalSales - totalPayments;

        // Calculate overdue amount (would need to join with sales documents for this)
        const { data: overdueInvoices } = await supabase
          .from('sales_documents')
          .select('total_amount')
          .eq('customer_id', customerId)
          .eq('company_id', companyId)
          .eq('document_type', 'invoice')
          .eq('payment_status', 'unpaid')
          .lt('due_date', new Date().toISOString().split('T')[0]);
          
        const overdueAmount = overdueInvoices?.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0) || 0;

        const summary = {
          opening_balance: openingBalanceValue, // Use the calculated value with proper sign
          total_sales: totalSales,
          total_payments: totalPayments,
          current_balance: currentBalance,
          overdue_amount: overdueAmount,
          credit_limit: parseFloat(customer.credit_limit) || 0,
          available_credit: Math.max(0, (parseFloat(customer.credit_limit) || 0) - Math.abs(currentBalance))
        };

        console.log('Calculated summary:', summary);

        return {
          success: true,
          data: {
            customer,
            transactions: filteredTransactions.reverse(), // Show newest first
            summary
          },
          error: null
        };
      }

      // Fallback to old method if no ledger entries exist
      console.log('⚠️ No ledger entries found, falling back to document-based calculation');
      
      // Build query for sales documents (invoices only)
      // Removed status filter since sales documents don't have status field
      let salesQuery = supabase
        .from('sales_documents')
        .select('id, document_type, document_number, document_date, due_date, total_amount, paid_amount, payment_status, status, created_at')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .eq('document_type', 'invoice')

      // For payments, we'll use the paid_amount from sales documents based on your schema
      // As per project memory, payments are tracked through updates to paid_amount field in sales_documents table
      let paymentsQuery = supabase
        .from('sales_documents')
        .select('id, document_type, document_number, document_date, due_date, total_amount, paid_amount, payment_status, status, created_at')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .eq('document_type', 'invoice')

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

      console.log('Sales result:', salesResult);
      console.log('Payments result:', paymentsResult);

      if (salesResult.error) {
        console.error('Error fetching sales:', salesResult.error);
        return { success: false, data: null, error: handleSupabaseError(salesResult.error) }
      }
      if (paymentsResult.error) {
        console.error('Error fetching payments:', paymentsResult.error);
        return { success: false, data: null, error: handleSupabaseError(paymentsResult.error) }
      }

      // Process sales documents into transactions (Invoices only)
      const salesTransactions = (salesResult.data || []).map(doc => ({
        id: doc.id,
        date: doc.document_date,
        type: doc.document_type,
        document_number: doc.document_number,
        description: 'Sales Invoice',
        debit: parseFloat(doc.total_amount) || 0, // Only invoices create debit
        credit: 0,
        status: doc.status,
        payment_status: doc.payment_status,
        due_date: doc.due_date,
        created_at: doc.created_at
      }))

      // Process payments from paid_amount in invoices
      const paymentTransactions = (paymentsResult.data || []).map(doc => ({
        id: doc.id,
        date: doc.document_date,
        type: 'payment',
        document_number: doc.document_number,
        description: 'Payment received',
        debit: 0,
        credit: parseFloat(doc.paid_amount) || 0,
        status: doc.status,
        payment_status: doc.payment_status,
        created_at: doc.created_at
      }))

      console.log('Sales transactions:', salesTransactions);
      console.log('Payment transactions:', paymentTransactions);

      // Combine and sort all transactions by date (oldest first for balance calculation)
      const allTransactions = [...salesTransactions, ...paymentTransactions]
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      console.log('All transactions:', allTransactions);

      // Calculate running balance - ONLY from invoices as per requirement
      // Opening balance handling: 
      // - If debit (customer owes us), positive value
      // - If credit (we owe customer), negative value
      const openingBalanceInitial = parseFloat(customer.opening_balance) || 0;
      const openingBalanceValueInitial = customer.opening_balance_type === 'debit' ? openingBalanceInitial : -openingBalanceInitial;
      let runningBalance = openingBalanceValueInitial;
      
      const transactionsWithBalance = allTransactions.map(transaction => {
        // Update running balance based on transaction type
        if (transaction.type === 'invoice') {
          // Invoice increases what customer owes us (debit)
          runningBalance += transaction.debit;
        } else if (transaction.type === 'payment') {
          // Payment decreases what customer owes us (credit)
          runningBalance -= transaction.credit;
        }
        return {
          ...transaction,
          balance: runningBalance
        }
      })

      console.log('Transactions with balance:', transactionsWithBalance);

      // Apply additional filters
      let filteredTransactions = transactionsWithBalance
      
      if (filters.transactionType) {
        filteredTransactions = filteredTransactions.filter(t => t.type === filters.transactionType)
      }
      if (filters.status) {
        filteredTransactions = filteredTransactions.filter(t => t.status === filters.status)
      }

      // Calculate summary - ONLY from invoices as per requirement
      const invoiceTransactions = salesTransactions
      const totalSales = invoiceTransactions.reduce((sum, t) => sum + t.debit, 0)
      
      const totalPayments = paymentTransactions.reduce((sum, t) => sum + t.credit, 0)
      
      // Current balance calculation:
      // - Opening balance (Dr) = amount customer owes us (positive)
      // - Total sales = amount customer owes us for new purchases (add)
      // - Total payments = amount customer paid us (subtract)
      const openingBalance = parseFloat(customer.opening_balance) || 0;
      // If opening balance is debit type, customer owes us money (positive)
      // If opening balance is credit type, we owe customer money (negative)
      const openingBalanceValue = customer.opening_balance_type === 'debit' ? openingBalance : -openingBalance;
      
      // Current balance = What customer owes us - What we owe customer
      // All values are positive here, we determine sign based on type
      const currentBalance = openingBalanceValue + totalSales - totalPayments
      
      console.log('DEBUG ACTUAL CALCULATION:', {
        openingBalance,
        openingBalanceType: customer.opening_balance_type,
        openingBalanceValue,
        totalSales,
        totalPayments,
        calculatedCurrentBalance: openingBalanceValue + totalSales - totalPayments,
        returnedCurrentBalance: currentBalance
      });

      // Calculate overdue amount (invoices past due date)
      const today = new Date().toISOString().split('T')[0]
      const overdueAmount = invoiceTransactions
        .filter(t => t.due_date && t.due_date < today && t.payment_status !== 'paid')
        .reduce((sum, t) => sum + t.debit, 0)

      const summary = {
        opening_balance: openingBalanceValue, // Use the calculated value with proper sign
        total_sales: totalSales,
        total_payments: totalPayments,
        current_balance: currentBalance,
        overdue_amount: overdueAmount,
        credit_limit: parseFloat(customer.credit_limit) || 0,
        available_credit: (parseFloat(customer.credit_limit) || 0) - Math.abs(currentBalance)
      }

      console.log('Fallback summary:', summary);

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
      console.error('Error in getCustomerLedger:', error);
      return { success: false, data: null, error: error.message }
    }
  }
}

// Export singleton instance
const customerService = new CustomerService()
export default customerService