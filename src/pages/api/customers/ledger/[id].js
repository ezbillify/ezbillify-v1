// pages/api/customers/ledger/[id].js
import { withAuth } from '../../../../lib/middleware'
import customerService from '../../../../services/customerService'

async function handler(req, res) {
  const { method } = req
  const { id: customerId } = req.query

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
      date_to
    } = req.query

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      })
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await customerService.getCustomer(customerId, company_id)

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      })
    }

    // Prepare filters
    const filters = {}
    if (date_from) filters.dateFrom = date_from
    if (date_to) filters.dateTo = date_to

    // Get customer ledger data
    const result = await customerService.getCustomerLedger(customerId, company_id, filters)

    if (result.success) {
      // Transform data to match expected format
      const ledgerData = result.data
      
      return res.status(200).json({
        success: true,
        data: {
          transactions: ledgerData.transactions,
          summary: {
            opening_balance: ledgerData.summary.opening_balance,
            total_invoices: ledgerData.summary.total_sales,
            total_payments: ledgerData.summary.total_payments,
            total_returns: 0, // Not implemented yet
            closing_balance: ledgerData.summary.current_balance,
            advance_balance: 0, // Not implemented yet
            net_receivable: ledgerData.summary.current_balance // For customer ledger, this is what customer owes us
          }
        }
      })
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch customer ledger'
      })
    }
  } catch (error) {
    console.error('Customer Ledger API Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)