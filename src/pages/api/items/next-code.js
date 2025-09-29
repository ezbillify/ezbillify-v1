// pages/api/items/next-code.js - FIXED
import { supabase } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  if (method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // FIXED: Use req.auth instead of req.userProfile
    const company_id = req.query.company_id || req.auth?.profile?.company_id
    const item_type = req.query.item_type || 'product'

    console.log('Generating next code for:', { company_id, item_type })

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      })
    }

    const nextCode = await generateNextItemCode(company_id, item_type)

    console.log('Generated next code:', nextCode)

    return res.status(200).json({
      success: true,
      code: nextCode
    })

  } catch (error) {
    console.error('Next code API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate item code'
    })
  }
}

async function generateNextItemCode(company_id, item_type) {
  try {
    const prefix = item_type === 'service' ? 'SRV' : 'ITM'
    
    const { data: lastItem } = await supabase
      .from('items')
      .select('item_code')
      .eq('company_id', company_id)
      .like('item_code', `${prefix}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let nextNumber = 1
    if (lastItem && lastItem.item_code) {
      const match = lastItem.item_code.match(new RegExp(`${prefix}-(\\d+)`))
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }

    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`
  } catch (error) {
    console.error('Error generating item code:', error)
    const timestamp = Date.now().toString().slice(-4)
    return `${item_type === 'service' ? 'SRV' : 'ITM'}-${timestamp}`
  }
}

export default withAuth(handler)