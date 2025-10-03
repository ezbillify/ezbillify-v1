// pages/api/integrations/veekaart/sync-pricing.js
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

    // Get pricing data to sync
    let query = supabase
      .from('items')
      .select('id, item_code, item_name, selling_price, purchase_price, mrp, metadata, updated_at')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .eq('is_for_sale', true)

    if (!sync_all && items.length > 0) {
      query = query.in('id', items)
    }

    const { data: pricingItems, error: pricingError } = await query

    if (pricingError) {
      return res.status(500).json({ error: 'Failed to fetch pricing data' })
    }

    if (!pricingItems || pricingItems.length === 0) {
      return res.status(400).json({ error: 'No pricing items found to sync' })
    }

    // Transform pricing data for VeeKaart
    const pricingUpdates = pricingItems.map(item => ({
      sku: item.item_code,
      product_name: item.item_name,
      selling_price: parseFloat(item.selling_price || 0),
      purchase_price: parseFloat(item.purchase_price || 0),
      mrp: parseFloat(item.mrp || item.selling_price || 0),
      currency: 'INR',
      effective_date: new Date().toISOString(),
      last_updated: item.updated_at,
      ezbillify_item_id: item.id
    }))

    // Get VeeKaart API credentials
    const veekaartConfig = integration.api_config || {}
    const veekaartApiUrl = veekaartConfig.api_url
    const veekaartApiKey = veekaartConfig.api_key

    if (!veekaartApiUrl || !veekaartApiKey) {
      return res.status(400).json({ error: 'VeeKaart API configuration incomplete' })
    }

    // Send pricing updates to VeeKaart
    const syncResults = {
      total: pricingUpdates.length,
      success: 0,
      failed: 0,
      errors: []
    }

    // Try bulk pricing update first
    try {
      const response = await fetch(`${veekaartApiUrl}/pricing/bulk-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${veekaartApiKey}`,
          'X-Source': 'ezbillify'
        },
        body: JSON.stringify({
          updates: pricingUpdates,
          sync_timestamp: new Date().toISOString()
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        syncResults.success = result.processed || pricingUpdates.length
        syncResults.failed = result.failed || 0
        syncResults.errors = result.errors || []

        // Update metadata for successfully synced items
        for (const update of pricingUpdates) {
          await supabase
            .from('items')
            .update({
              metadata: supabase.raw(`metadata || '{"veekaart_pricing_synced": true, "last_pricing_sync": "${new Date().toISOString()}", "synced_selling_price": ${update.selling_price}, "synced_mrp": ${update.mrp}}'::jsonb`),
              updated_at: new Date().toISOString()
            })
            .eq('id', update.ezbillify_item_id)
        }
      } else {
        // If bulk update fails, try individual updates
        for (const update of pricingUpdates) {
          try {
            const individualResponse = await fetch(`${veekaartApiUrl}/pricing/update`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${veekaartApiKey}`,
                'X-Source': 'ezbillify'
              },
              body: JSON.stringify(update)
            })

            const individualResult = await individualResponse.json()

            if (individualResponse.ok && individualResult.success) {
              syncResults.success++
              
              // Update metadata
              await supabase
                .from('items')
                .update({
                  metadata: supabase.raw(`metadata || '{"veekaart_pricing_synced": true, "last_pricing_sync": "${new Date().toISOString()}", "synced_selling_price": ${update.selling_price}, "synced_mrp": ${update.mrp}}'::jsonb`),
                  updated_at: new Date().toISOString()
                })
                .eq('id', update.ezbillify_item_id)
            } else {
              syncResults.failed++
              syncResults.errors.push({
                sku: update.sku,
                error: individualResult.error || 'Unknown error'
              })
            }
          } catch (error) {
            syncResults.failed++
            syncResults.errors.push({
              sku: update.sku,
              error: error.message
            })
          }
        }
      }
    } catch (error) {
      console.error('Bulk pricing sync error:', error)
      return res.status(500).json({ error: 'Failed to sync pricing with VeeKaart' })
    }

    // Update integration sync status
    await supabase
      .from('integrations')
      .update({
        last_sync: new Date().toISOString(),
        sync_settings: supabase.raw(`sync_settings || '{"last_pricing_sync": {"timestamp": "${new Date().toISOString()}", "items_synced": ${syncResults.success}, "items_failed": ${syncResults.failed}}}'::jsonb`)
      })
      .eq('id', integration.id)

    // Log sync activity
    await supabase
      .from('webhook_events')
      .insert({
        company_id: company_id,
        event_type: 'ezbillify.pricing.sync_to_veekaart',
        event_data: {
          sync_results: syncResults,
          items_count: pricingUpdates.length,
          sync_type: sync_all ? 'full_sync' : 'partial_sync'
        },
        status: syncResults.failed === 0 ? 'completed' : 'partial_success',
        response_status: 200,
        sent_at: new Date().toISOString()
      })

    return res.status(200).json({
      success: true,
      message: 'Pricing sync completed',
      results: syncResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Pricing sync error:', error)

    // Log failed sync
    await supabase
      .from('webhook_events')
      .insert({
        company_id: req.body.company_id,
        event_type: 'ezbillify.pricing.sync_to_veekaart',
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