// pages/api/customers/[id]/balance.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'
import customerService from '../../../../services/customerService'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Customer ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getCustomerBalance(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Customer Balance API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getCustomerBalance(req, res, customerId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Get customer ledger data which includes balance calculation
    const result = await customerService.getCustomerLedger(customerId, company_id)
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          balance: result.data.summary.current_balance,
          summary: result.data.summary
        }
      })
    } else {
      return res.status(404).json({
        success: false,
        error: 'Customer not found or unable to calculate balance'
      })
    }
  } catch (error) {
    console.error('Error fetching customer balance:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer balance'
    })
  }
}

export default withAuth(handler)