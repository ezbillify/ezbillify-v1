// pages/api/integrations/veekaart/push-inventory.js
import { supabaseAdmin } from '../../../../services/utils/supabase'

const VEEKAART_SYNC_URL = process.env.VEEKAART_SYNC_URL || 'http://localhost:3002'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Fetch inventory from items table (current_stock column)
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('id, item_code, current_stock, reserved_stock, available_stock')
      .is('deleted_at', null)

    if (itemsError) {
      throw itemsError
    }

    if (!items || items.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No inventory to sync',
        data: { synced_count: 0 }
      })
    }

    // Transform inventory data
    const inventoryData = items.map(item => ({
      id: item.id,
      sku: item.item_code,
      quantity: parseFloat(item.current_stock) || 0,
      reserved_quantity: parseFloat(item.reserved_stock) || 0,
      available_quantity: parseFloat(item.available_stock) || 0
    }))

    // Send to Veekaart
    const response = await fetch(`${VEEKAART_SYNC_URL}/api/sync/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inventory: inventoryData
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.details || result.error || 'Failed to push inventory to Veekaart')
    }

    return res.status(200).json({
      success: true,
      message: 'Inventory pushed to Veekaart',
      data: result.data
    })
  } catch (error) {
    console.error('Error pushing inventory:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}