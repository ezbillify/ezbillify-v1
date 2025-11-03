// pages/api/customers/[id]/balance.js - OPTIMIZED
import { withAuth } from '../../../../lib/middleware'
import customerService from '../../../../services/customerService'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { id } = req.query
  const { company_id } = req.query

  if (!id || !company_id) {
    return res.status(400).json({
      success: false,
      error: 'Customer ID and Company ID are required'
    })
  }

  try {
    console.log(`🔄 Fetching balance for customer ${id}`)

    // ✅ Uses customerService which has caching and optimization
    const result = await customerService.getCustomerLedger(id, company_id)
    
    if (result.success) {
      console.log(`✅ Balance fetched: ${result.data.summary.current_balance}`)
      
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
        error: result.error || 'Customer not found'
      })
    }
  } catch (error) {
    console.error('Error fetching customer balance:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer balance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)