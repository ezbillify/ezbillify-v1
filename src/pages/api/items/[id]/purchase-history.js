// src/pages/api/items/[id]/purchase-history.js
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
    // Get purchase history from purchase_document_items
    const { data: purchases, error } = await supabaseAdmin
      .from('purchase_document_items')
      .select(`
        *,
        document:purchase_documents!inner(
          id,
          document_number,
          document_date,
          document_type,
          vendor_name,
          status,
          branch:branches(id, name, document_prefix)
        )
      `)
      .eq('item_id', item_id)
      .eq('document.company_id', company_id)
      .eq('document.document_type', 'bill')
      .order('document(document_date)', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      console.error('Error fetching purchase history:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch purchase history'
      })
    }

    // Transform data to match expected format
    const formattedData = purchases?.map(item => ({
      document_id: item.document?.id,
      document_number: item.document?.document_number,
      document_date: item.document?.document_date,
      vendor_name: item.document?.vendor_name,
      quantity: item.quantity,
      rate: item.rate,
      total_amount: item.total_amount,
      branch: item.document?.branch,
      created_at: item.created_at
    })) || []

    return res.status(200).json({
      success: true,
      data: formattedData
    })

  } catch (error) {
    console.error('Purchase history API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}
