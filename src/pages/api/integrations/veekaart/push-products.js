// pages/api/integrations/veekaart/push-products.js
import { supabaseAdmin } from '../../../../services/utils/supabase'

const VEEKAART_SYNC_URL = process.env.VEEKAART_SYNC_URL || 'http://localhost:3002'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the current user from auth header
    const authHeader = req.headers.authorization
    let userId = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
      
      if (!userError && user) {
        userId = user.id
      }
    }

    // If no auth, try to get from the first company (fallback for testing)
    let company_id = null

    if (userId) {
      // Get user's company
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .single()

      company_id = userProfile?.company_id
    }

    // If still no company, get the first/default company (for testing without auth)
    if (!company_id) {
      const { data: companies } = await supabaseAdmin
        .from('companies')
        .select('id')
        .limit(1)

      company_id = companies?.[0]?.id
    }

    if (!company_id) {
      return res.status(400).json({ error: 'No company found for user' })
    }

    console.log('Syncing products for company:', company_id)

    // Fetch only active, non-deleted products for this company
    const { data: products, error: productsError } = await supabaseAdmin
      .from('items')
      .select('id, item_code, item_name, description, hsn_sac_code, company_id, selling_price, mrp, tax_rate_id, is_active')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .is('deleted_at', null)

    console.log('Products count:', products?.length)
    console.log('Products error:', productsError)

    if (productsError) {
      throw productsError
    }

    if (!products || products.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No products to sync',
        data: { synced_count: 0 }
      })
    }

    // Get tax rates for products that have tax_rate_id
    const taxRateIds = [...new Set(products.map(p => p.tax_rate_id).filter(Boolean))]
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

    // Transform products for Veekaart
    const productsWithPricing = products.map(product => ({
      id: product.id,
      sku: product.item_code,
      name: product.item_name,
      description: product.description,
      hsn_sac_code: product.hsn_sac_code,
      price: parseFloat(product.selling_price) || 0,
      mrp: parseFloat(product.mrp) || 0,
      tax_rate: taxRates[product.tax_rate_id] || 0,
      company_id: product.company_id,
      status: product.is_active ? 'active' : 'inactive'
    }))

    console.log('Sending to Veekaart:', productsWithPricing.length, 'products')

    // Send to Veekaart
    const response = await fetch(`${VEEKAART_SYNC_URL}/api/sync/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: productsWithPricing
      })
    })

    const result = await response.json()

    console.log('Veekaart response:', result)

    if (!response.ok) {
      throw new Error(result.details || result.error || 'Failed to push products to Veekaart')
    }

    return res.status(200).json({
      success: true,
      message: 'Products pushed to Veekaart',
      data: result.data
    })
  } catch (error) {
    console.error('Error pushing products:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}