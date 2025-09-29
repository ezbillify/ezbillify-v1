// pages/api/integrations/veekaart/sync-inventory.js
import { supabase } from '../../../../services/utils/supabase'

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

    // Get inventory data to sync
    let query = supabase
      .from('items')
      .select('id, item_code, item_name, current_stock, available_stock, reserved_stock, reorder_level, track_inventory, metadata')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .eq('track_inventory', true)

    if (!sync_all && items.length > 0) {
      query = query.in('id', items)
    }

    const { data: inventoryItems, error: inventoryError } = await query

    if (inventoryError) {
      return res.status(500).json({ error: 'Failed to fetch inventory data' })
    }

    if (!inventoryItems || inventoryItems.length === 0) {
      return res.status(400).json({ error: 'No inventory items found to sync' })
    }

    // Transform inventory data for VeeKaart
    const inventoryUpdates = inventoryItems.map(item => ({
      sku: item.item_code,
      product_name: item.item_name,
      stock_quantity: parseFloat(item.current_stock || 0),
      available_stock: parseFloat(item.available_stock || 0),
      reserved_stock: parseFloat(item.reserved_stock || 0),
      low_stock_threshold: parseFloat(item.reorder_level || 0),
      track_inventory: item.track_inventory,
      last_updated: new Date().toISOString(),
      ezbillify_item_id: item.id
    }))

    // Get VeeKaart API credentials
    const veekaartConfig = integration.api_config || {}
    const veekaartApiUrl = veekaartConfig.api_url
    const veekaartApiKey = veekaartConfig.api_key

    if (!veekaartApiUrl || !veekaartApiKey) {
      return res.status(400).json({ error: 'VeeKaart API configuration incomplete' })
    }

    // Send inventory updates to VeeKaart
    const syncResults = {
      total: inventoryUpdates.length,
      success: 0,
      failed: 0,
      errors: []
    }

    // Batch inventory updates (VeeKaart might support bulk updates)
    try {
      const response = await fetch(`${veekaartApiUrl}/inventory/bulk-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${veekaartApiKey}`,
          'X-Source': 'ezbillify'
        },
        body: JSON.stringify({
          updates: inventoryUpdates,
          sync_timestamp: new Date().toISOString()
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        syncResults.success = result.processed || inventoryUpdates.length
        syncResults.failed = result.failed || 0
        syncResults.errors = result.errors || []

        // Update metadata for successfully synced items
        for (const update of inventoryUpdates) {
          await supabase
            .from('items')
            .update({
              metadata: supabase.raw(`metadata || '{"veekaart_inventory_synced": true, "last_inventory_sync": "${new Date().toISOString()}"}'::jsonb`),
              updated_at: new Date().toISOString()
            })
            .eq('id', update.ezbillify_item_id)
        }
      } else {
        // If bulk update fails, try individual updates
        for (const update of inventoryUpdates) {
          try {
            const individualResponse = await fetch(`${veekaartApiUrl}/inventory/update`, {
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
                  metadata: supabase.raw(`metadata || '{"veekaart_inventory_synced": true, "last_inventory_sync": "${new Date().toISOString()}"}'::jsonb`),
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
      console.error('Bulk inventory sync error:', error)
      return res.status(500).json({ error: 'Failed to sync inventory with VeeKaart' })
    }

    // Update integration sync status
    await supabase
      .from('integrations')
      .update({
        last_sync: new Date().toISOString(),
        sync_settings: supabase.raw(`sync_settings || '{"last_inventory_sync": {"timestamp": "${new Date().toISOString()}", "items_synced": ${syncResults.success}, "items_failed": ${syncResults.failed}}}'::jsonb`)
      })
      .eq('id', integration.id)

    // Log sync activity
    await supabase
      .from('webhook_events')
      .insert({
        company_id: company_id,
        event_type: 'ezbillify.inventory.sync_to_veekaart',
        event_data: {
          sync_results: syncResults,
          items_count: inventoryUpdates.length,
          sync_type: sync_all ? 'full_sync' : 'partial_sync'
        },
        status: syncResults.failed === 0 ? 'completed' : 'partial_success',
        response_status: 200,
        sent_at: new Date().toISOString()
      })

    return res.status(200).json({
      success: true,
      message: 'Inventory sync completed',
      results: syncResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Inventory sync error:', error)

    // Log failed sync
    await supabase
      .from('webhook_events')
      .insert({
        company_id: req.body.company_id,
        event_type: 'ezbillify.inventory.sync_to_veekaart',
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