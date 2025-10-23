// src/pages/api/items/[id]/stock-movements.js
import { supabaseAdmin } from '../../../../services/utils/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { id: item_id } = req.query
  const { company_id, limit = 50 } = req.query

  if (!company_id || !item_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and Item ID are required'
    })
  }

  try {
    const { data: movements, error } = await supabaseAdmin
      .from('inventory_movements')
      .select(`
        *,
        branch:branches(id, name, document_prefix)
      `)
      .eq('company_id', company_id)
      .eq('item_id', item_id)
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      console.error('Error fetching stock movements:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch stock movements'
      })
    }

    return res.status(200).json({
      success: true,
      data: movements || []
    })

  } catch (error) {
    console.error('Stock movements API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}
