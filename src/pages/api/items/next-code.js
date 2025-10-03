// pages/api/items/next-code.js
import { createClient } from '@supabase/supabase-js'
import { withAuth } from '../../../lib/middleware'

// Create admin client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function handler(req, res) {
  const { method } = req

  if (method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  try {
    const company_id = req.query.company_id || req.auth?.profile?.company_id
    const item_type = req.query.item_type || 'product'

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      })
    }

    const nextCode = await generateNextItemCode(company_id, item_type)

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
    
    // Use admin client to bypass RLS
    const { data: items, error } = await supabaseAdmin
      .from('items')
      .select('item_code')
      .eq('company_id', company_id)
      .ilike('item_code', `${prefix}-%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database query error:', error)
      throw error
    }

    let nextNumber = 1
    
    if (items && items.length > 0) {
      const numbers = items
        .map(item => {
          const match = item.item_code.match(new RegExp(`${prefix}-(\\d+)`, 'i'))
          return match ? parseInt(match[1]) : 0
        })
        .filter(num => !isNaN(num) && num > 0)
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1
      }
    }

    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`
  } catch (error) {
    console.error('Error in generateNextItemCode:', error)
    throw error
  }
}

export default withAuth(handler)