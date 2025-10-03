// pages/api/integrations/veekaart/sync-products.js
import { supabase } from '../../../../../../services/utils/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { company_id, items = [], sync_all = false } = req.body

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    // Get company details and VeeKaart integration
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' })
    }

    // Get VeeKaart integration settings
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('integration_type', 'veekaart')
      .eq('is_active', true)
      .single()

    if (integrationError || !integration) {
      return res.status(400).json({ error: 'VeeKaart integration not found or inactive' })
    }

    // Get products to sync
    let query = supabase
      .from('items')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .eq('is_for_sale', true)

    if (!sync_all && items.length > 0) {
      query = query.in('id', items)
    }

    const { data: products, error: productsError } = await query

    if (productsError) {
      return res.status(500).json({ error: 'Failed to fetch products' })
    }

    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'No products found to sync' })
    }

    // Transform EzBillify products to VeeKaart format
    const veekaartProducts = products.map(product => ({
      sku: product.item_code,
      name: product.item_name,
      description: product.description || '',
      category: product.category || 'General',
      brand: product.brand || '',
      
      // Pricing
      selling_price: parseFloat(product.selling_price || 0),
      mrp: parseFloat(product.mrp || product.selling_price || 0),
      purchase_price: parseFloat(product.purchase_price || 0),
      
      // Inventory
      stock_quantity: parseFloat(product.current_stock || 0),
      track_inventory: product.track_inventory || false,
      low_stock_threshold: parseFloat(product.reorder_level || 0),
      
      // Tax and compliance
      hsn_code: product.hsn_sac_code || '',
      tax_preference: product.tax_preference || 'taxable',
      
      // Additional details
      barcode: product.barcode || '',
      images: product.images || [],
      specifications: product.specifications || {},
      
      // Units
      unit: product.primary_unit_name || 'PCS',
      
      // Status
      is_active: product.is_active,
      
      // Metadata for tracking
      ezbillify_item_id: product.id,
      last_updated: product.updated_at
    }))

    // Get VeeKaart API credentials (decrypt if needed)
    const veekaartConfig = integration.api_config || {}
    const veekaartApiUrl = veekaartConfig.api_url
    const veekaartApiKey = veekaartConfig.api_key

    if (!veekaartApiUrl || !veekaartApiKey) {
      return res.status(400).json({ error: 'VeeKaart API configuration incomplete' })
    }

    // Send products to VeeKaart
    const syncResults = {
      total: veekaartProducts.length,
      success: 0,
      failed: 0,
      errors: []
    }

    for (const product of veekaartProducts) {
      try {
        const response = await fetch(`${veekaartApiUrl}/products/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${veekaartApiKey}`,
            'X-Source': 'ezbillify'
          },
          body: JSON.stringify({
            action: 'upsert',
            product: product
          })
        })

        const result = await response.json()

        if (response.ok && result.success) {
          syncResults.success++
          
          // Update product metadata with VeeKaart sync info
          await supabase
            .from('items')
            .update({
              metadata: supabase.raw(`metadata || '{"veekaart_synced": true, "veekaart_product_id": "${result.product_id || ''}", "last_veekaart_sync": "${new Date().toISOString()}"}'::jsonb`),
              updated_at: new Date().toISOString()
            })
            .eq('id', product.ezbillify_item_id)
          
        } else {
          syncResults.failed++
          syncResults.errors.push({
            sku: product.sku,
            error: result.error || 'Unknown error'
          })
        }
      } catch (error) {
        console.error(`Error syncing product ${product.sku}:`, error)
        syncResults.failed++
        syncResults.errors.push({
          sku: product.sku,
          error: error.message
        })
      }
    }

    // Update integration last sync time
    await supabase
      .from('integrations')
      .update({
        last_sync: new Date().toISOString(),
        sync_settings: supabase.raw(`sync_settings || '{"last_product_sync": {"timestamp": "${new Date().toISOString()}", "products_synced": ${syncResults.success}, "products_failed": ${syncResults.failed}}}'::jsonb`)
      })
      .eq('id', integration.id)

    // Log sync activity
    await supabase
      .from('webhook_events')
      .insert({
        company_id: company_id,
        event_type: 'ezbillify.products.sync_to_veekaart',
        event_data: {
          sync_results: syncResults,
          products_count: veekaartProducts.length,
          sync_type: sync_all ? 'full_sync' : 'partial_sync'
        },
        status: syncResults.failed === 0 ? 'completed' : 'partial_success',
        response_status: 200,
        sent_at: new Date().toISOString()
      })

    return res.status(200).json({
      success: true,
      message: 'Product sync completed',
      results: syncResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Product sync error:', error)

    // Log failed sync
    await supabase
      .from('webhook_events')
      .insert({
        company_id: req.body.company_id,
        event_type: 'ezbillify.products.sync_to_veekaart',
        event_data: req.body,
        status: 'failed',
        error_message: error.message,
        response_status: 500,
        sent_at: new Date().toISOString()
      })

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}