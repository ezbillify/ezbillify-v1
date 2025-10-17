// pages/api/integrations/veekaart/push-pricing.js
import { supabaseAdmin } from '../../../../services/utils/supabase'

const VEEKAART_SYNC_URL = process.env.VEEKAART_SYNC_URL || 'http://localhost:3002'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Fetch all items with pricing
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('id, item_code, purchase_price, selling_price, mrp, tax_rate_id')
      .is('deleted_at', null)

    if (itemsError) {
      throw itemsError
    }

    if (!items || items.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pricing to sync',
        data: { synced_count: 0 }
      })
    }

    // Get tax rates
    const taxRateIds = [...new Set(items.map(i => i.tax_rate_id).filter(Boolean))]
    let taxRates = {}

    if (taxRateIds.length > 0) {
      const { data: rates } = await supabaseAdmin
        .from('tax_rates')
        .select('id, percentage')
        .in('id', taxRateIds)

      rates?.forEach(rate => {
        taxRates[rate.id] = rate.percentage
      })
    }

    // Transform pricing data
    const pricingData = items.map(item => {
      const sellingPrice = parseFloat(item.selling_price) || 0
      const mrp = parseFloat(item.mrp) || 0
      const discount = mrp > 0 ? ((mrp - sellingPrice) / mrp * 100) : 0

      return {
        id: item.id,
        sku: item.item_code,
        cost_price: parseFloat(item.purchase_price) || 0,
        selling_price: sellingPrice,
        mrp: mrp,
        tax_rate: taxRates[item.tax_rate_id] || 0,
        discount_percentage: discount
      }
    })

    // Send to Veekaart
    const response = await fetch(`${VEEKAART_SYNC_URL}/api/sync/pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pricing: pricingData
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.details || result.error || 'Failed to push pricing to Veekaart')
    }

    return res.status(200).json({
      success: true,
      message: 'Pricing pushed to Veekaart',
      data: result.data
    })
  } catch (error) {
    console.error('Error pushing pricing:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}