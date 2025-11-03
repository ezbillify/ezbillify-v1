// pages/api/customers/[id]/credit-info.js - COMPREHENSIVE CREDIT CALCULATION
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { id: customerId } = req.query
  const { company_id } = req.query

  if (!customerId || !company_id) {
    return res.status(400).json({
      success: false,
      error: 'Customer ID and Company ID are required'
    })
  }

  try {
    // Fetch customer with credit limit and opening balance
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, name, credit_limit, opening_balance, opening_balance_type, discount_percentage')
      .eq('id', customerId)
      .eq('company_id', company_id)
      .single()

    if (customerError) {
      console.error('❌ Error fetching customer:', customerError)
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      })
    }

    // Calculate balance from ledger
    const { balance: ledgerBalance, source } = await calculateCustomerBalance(
      customerId,
      company_id,
      customer
    )

    const creditLimit = parseFloat(customer.credit_limit) || 0
    const discount = parseFloat(customer.discount_percentage) || 0
    const outstandingBalance = ledgerBalance

    // Calculate available credit
    let availableCredit = null
    let canCreateInvoice = true
    let creditStatus = 'unlimited' // 'unlimited', 'available', 'limited', 'exceeded'

    if (creditLimit > 0) {
      availableCredit = creditLimit - outstandingBalance
      
      if (outstandingBalance > creditLimit) {
        creditStatus = 'exceeded'
        canCreateInvoice = false
      } else if (outstandingBalance >= (creditLimit * 0.8)) {
        creditStatus = 'limited'
        canCreateInvoice = true
      } else {
        creditStatus = 'available'
        canCreateInvoice = true
      }
    } else {
      // No limit set (0 = unlimited)
      canCreateInvoice = true
      creditStatus = 'unlimited'
    }

    console.log(`✅ Credit Info calculated for customer ${customerId}:`, {
      creditLimit,
      outstandingBalance,
      availableCredit,
      creditStatus,
      canCreateInvoice
    })

    return res.status(200).json({
      success: true,
      data: {
        customer_id: customerId,
        customer_name: customer.name,
        credit_limit: creditLimit,
        discount_percentage: discount,
        outstanding_balance: outstandingBalance,
        available_credit: availableCredit,
        credit_status: creditStatus, // 'unlimited' | 'available' | 'limited' | 'exceeded'
        can_create_invoice: canCreateInvoice,
        balance_calculation_source: source, // 'ledger' | 'calculated' | 'opening_balance'
        summary: {
          display_text: getCreditStatusText(creditStatus, creditLimit, outstandingBalance, availableCredit),
          color: getCreditStatusColor(creditStatus),
          warning: creditStatus !== 'available' && creditStatus !== 'unlimited'
        }
      }
    })
  } catch (error) {
    console.error('❌ Error calculating credit info:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate credit information',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Calculate customer balance from ledger entries
 * Priority: Latest ledger entry > Calculate from invoices > Opening balance
 */
async function calculateCustomerBalance(customerId, companyId, customer) {
  try {
    // STEP 1: Try to get latest ledger entry
    console.log(`📊 Step 1: Checking latest ledger entry for customer ${customerId}`)
    
    const { data: latestLedger, error: ledgerError } = await supabaseAdmin
      .from('customer_ledger_entries')
      .select('balance, entry_date')
      .eq('customer_id', customerId)
      .eq('company_id', companyId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!ledgerError && latestLedger) {
      console.log(`✅ Found latest ledger balance: ₹${latestLedger.balance}`)
      return {
        balance: parseFloat(latestLedger.balance) || 0,
        source: 'ledger'
      }
    }

    // STEP 2: Calculate from invoices if no ledger
    console.log(`⚠️ Step 2: No ledger entry found, calculating from invoices`)
    
    const { data: invoices, error: invoiceError } = await supabaseAdmin
      .from('sales_documents')
      .select(`
        id,
        total_amount,
        paid_amount,
        document_type
      `)
      .eq('customer_id', customerId)
      .eq('company_id', companyId)
      .eq('document_type', 'invoice')
      .eq('status', 'issued') // Only count issued invoices

    if (invoiceError) {
      throw new Error(`Failed to fetch invoices: ${invoiceError.message}`)
    }

    let invoiceBalance = 0
    if (invoices && invoices.length > 0) {
      invoices.forEach(invoice => {
        const totalAmount = parseFloat(invoice.total_amount) || 0
        const paidAmount = parseFloat(invoice.paid_amount) || 0
        const balance = totalAmount - paidAmount
        invoiceBalance += balance
      })
      console.log(`✅ Calculated from ${invoices.length} invoices: ₹${invoiceBalance}`)
    }

    // STEP 3: Add opening balance
    const openingBalance = parseFloat(customer.opening_balance) || 0
    const openingBalanceType = customer.opening_balance_type || 'debit'
    const openingBalanceValue = openingBalanceType === 'credit' ? -openingBalance : openingBalance

    const totalBalance = openingBalanceValue + invoiceBalance

    console.log(`✅ Final balance = Opening (${openingBalanceValue}) + Invoices (${invoiceBalance}) = ₹${totalBalance}`)

    return {
      balance: totalBalance,
      source: 'calculated'
    }
  } catch (error) {
    console.error('❌ Error calculating balance:', error)
    
    // Fallback to opening balance
    const openingBalance = parseFloat(customer.opening_balance) || 0
    const openingBalanceType = customer.opening_balance_type || 'debit'
    const openingBalanceValue = openingBalanceType === 'credit' ? -openingBalance : openingBalance
    
    console.log(`⚠️ Falling back to opening balance: ₹${openingBalanceValue}`)
    
    return {
      balance: openingBalanceValue,
      source: 'opening_balance'
    }
  }
}

/**
 * Get human-readable credit status text
 */
function getCreditStatusText(status, creditLimit, outstanding, available) {
  if (status === 'unlimited') {
    return `Unlimited credit • Current: ₹${outstanding.toFixed(2)}`
  }
  if (status === 'exceeded') {
    return `⚠️ EXCEEDED • Limit: ₹${creditLimit.toFixed(2)} • Used: ₹${outstanding.toFixed(2)}`
  }
  if (status === 'limited') {
    const used = ((outstanding / creditLimit) * 100).toFixed(0)
    return `⚠️ Limited • Limit: ₹${creditLimit.toFixed(2)} • Used: ${used}% • Available: ₹${available.toFixed(2)}`
  }
  // available
  return `✓ Available • Limit: ₹${creditLimit.toFixed(2)} • Used: ₹${outstanding.toFixed(2)} • Available: ₹${available.toFixed(2)}`
}

/**
 * Get color for credit status
 */
function getCreditStatusColor(status) {
  const colors = {
    unlimited: 'blue',
    available: 'green',
    limited: 'yellow',
    exceeded: 'red'
  }
  return colors[status] || 'gray'
}

export default withAuth(handler)