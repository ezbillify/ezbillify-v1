// pages/api/vendors/ledger/[id].js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id: vendorId } = req.query

  if (method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    const {
      company_id,
      date_from,
      date_to,
      transaction_type = 'all',
      page = 1,
      limit = 100
    } = req.query

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      })
    }

    // ✅ STEP 1: Verify vendor exists and get opening balance
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .eq('company_id', company_id)
      .single()

    if (vendorError || !vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      })
    }

    const openingBalance = parseFloat(vendor.opening_balance || 0)
    const currentBalance = parseFloat(vendor.current_balance || 0)
    const advanceBalance = parseFloat(vendor.advance_amount || 0)

    // ✅ STEP 2: Build transactions query
    let dateFilter = {}
    if (date_from) {
      dateFilter.gte = { document_date: date_from }
    }
    if (date_to) {
      dateFilter.lte = { document_date: date_to }
    }

    // ✅ STEP 3: Fetch Bills (Debit - Money you owe vendor)
    let billsQuery = supabaseAdmin
      .from('purchase_documents')
      .select('*')
      .eq('company_id', company_id)
      .eq('vendor_id', vendorId)
      .eq('document_type', 'bill')
      .order('document_date', { ascending: false })

    if (date_from) billsQuery = billsQuery.gte('document_date', date_from)
    if (date_to) billsQuery = billsQuery.lte('document_date', date_to)

    const { data: bills, error: billsError } = await billsQuery

    if (billsError) {
      console.error('Error fetching bills:', billsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bills'
      })
    }

    // ✅ STEP 4: Fetch Payments (Credit - Money you paid to vendor)
    let paymentsQuery = supabaseAdmin
      .from('vendor_payments')
      .select(`
        *,
        bill_payments (
          bill_number,
          payment_amount
        )
      `)
      .eq('company_id', company_id)
      .eq('vendor_id', vendorId)
      .order('payment_date', { ascending: false })

    if (date_from) paymentsQuery = paymentsQuery.gte('payment_date', date_from)
    if (date_to) paymentsQuery = paymentsQuery.lte('payment_date', date_to)

    const { data: payments, error: paymentsError } = await paymentsQuery

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payments'
      })
    }

    // ✅ STEP 5: Fetch Debit Notes / Returns (Credit - Money vendor owes you back)
    let returnsQuery = supabaseAdmin
      .from('purchase_documents')
      .select('*')
      .eq('company_id', company_id)
      .eq('vendor_id', vendorId)
      .eq('document_type', 'debit_note')
      .order('document_date', { ascending: false })

    if (date_from) returnsQuery = returnsQuery.gte('document_date', date_from)
    if (date_to) returnsQuery = returnsQuery.lte('document_date', date_to)

    const { data: returns, error: returnsError } = await returnsQuery

    if (returnsError) {
      console.error('Error fetching returns:', returnsError)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch returns'
      })
    }

    // ✅ STEP 6: Combine and format all transactions
    const transactions = []

    // Add bills as debit entries
    bills?.forEach(bill => {
      transactions.push({
        id: bill.id,
        date: bill.document_date,
        type: 'bill',
        document_number: bill.document_number,
        reference: bill.vendor_invoice_number || '',
        description: `Bill - ${bill.document_number}${bill.vendor_invoice_number ? ` (Vendor Invoice: ${bill.vendor_invoice_number})` : ''}`,
        debit: parseFloat(bill.total_amount || 0),
        credit: 0,
        balance: 0, // Will calculate running balance later
        status: bill.payment_status,
        notes: bill.notes
      })
    })

    // Add payments as credit entries
    payments?.forEach(payment => {
      const billsCount = payment.bill_payments?.length || 0
      const description = billsCount > 0
        ? `Payment - ${payment.payment_method.replace('_', ' ')} (${billsCount} bill${billsCount > 1 ? 's' : ''})`
        : `Advance Payment - ${payment.payment_method.replace('_', ' ')}`

      transactions.push({
        id: payment.id,
        date: payment.payment_date,
        type: 'payment',
        document_number: payment.payment_number,
        reference: payment.reference_number || '',
        description: description,
        debit: 0,
        credit: parseFloat(payment.amount || 0),
        balance: 0,
        payment_method: payment.payment_method,
        notes: payment.notes
      })
    })

    // Add returns as credit entries
    returns?.forEach(ret => {
      transactions.push({
        id: ret.id,
        date: ret.document_date,
        type: 'return',
        document_number: ret.document_number,
        reference: ret.parent_document_id ? `Return for Bill` : '',
        description: `Debit Note - ${ret.document_number}`,
        debit: 0,
        credit: parseFloat(ret.total_amount || 0),
        balance: 0,
        status: ret.status,
        notes: ret.notes
      })
    })

    // ✅ STEP 7: Sort by date (newest first for display)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date))

    // ✅ STEP 8: Calculate running balance
    // For ledger: Start with opening balance, then add debits (bills) and subtract credits (payments/returns)
    let runningBalance = openingBalance
    
    // Reverse array to calculate from oldest to newest
    const sortedForBalance = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))
    
    sortedForBalance.forEach(txn => {
      runningBalance += txn.debit - txn.credit
      txn.balance = runningBalance
    })

    // ✅ STEP 9: Apply pagination
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const offset = (pageNum - 1) * limitNum
    
    const paginatedTransactions = transactions.slice(offset, offset + limitNum)
    const totalPages = Math.ceil(transactions.length / limitNum)

    // ✅ STEP 10: Calculate summary
    const totalBills = bills?.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0) || 0
    const totalPayments = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
    const totalReturns = returns?.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0) || 0

    // Closing balance = Opening + Bills - Payments - Returns
    const closingBalance = openingBalance + totalBills - totalPayments - totalReturns
    
    // ✅ Calculate proper net payable (what you actually owe after everything)
    const netPayable = closingBalance - advanceBalance

    return res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          vendor_name: vendor.vendor_name,
          vendor_code: vendor.vendor_code,
          opening_balance: openingBalance,
          opening_balance_type: vendor.opening_balance_type || 'payable',
          current_balance: currentBalance,
          advance_amount: advanceBalance
        },
        transactions: paginatedTransactions,
        summary: {
          opening_balance: openingBalance,
          total_bills: totalBills,
          total_payments: totalPayments,
          total_returns: totalReturns,
          closing_balance: closingBalance,
          advance_balance: advanceBalance,
          net_payable: netPayable  // ✅ FIXED: closingBalance - advanceBalance
        },
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_records: transactions.length,
          per_page: limitNum,
          has_next_page: pageNum < totalPages,
          has_prev_page: pageNum > 1
        }
      }
    })

  } catch (error) {
    console.error('Vendor Ledger API Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)