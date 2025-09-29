// pages/api/webhooks/veekaart/products.js
import { supabase } from '../../../../services/utils/supabase'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify API key
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')
    const signature = req.headers['x-veekaart-signature']
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' })
    }

    // Find company by API key
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, webhook_secret')
      .eq('api_key', apiKey)
      .single()

    if (companyError || !company) {
      return res.status(401).json({ error: 'Invalid API key' })
    }

    // Verify webhook signature if present
    if (signature && company.webhook_secret) {
      const payload = JSON.stringify(req.body)
      const expectedSignature = crypto
        .createHmac('sha256', company.webhook_secret)
        .update(payload)
        .digest('hex')
      
      if (`sha256=${expectedSignature}` !== signature) {
        return res.status(401).json({ error: 'Invalid signature' })
      }
    }

    const productData = req.body
    const eventType = productData.event_type // 'sync_confirmation', 'stock_updated', 'price_updated'

    // Handle different product events
    let result = null
    
    switch (eventType) {
      case 'sync_confirmation':
        result = await handleSyncConfirmation(company.id, productData)
        break
      case 'stock_updated':
        result = await handleStockUpdate(company.id, productData)
        break
      case 'price_updated':
        result = await handlePriceUpdate(company.id, productData)
        break
      default:
        return res.status(400).json({ error: 'Invalid event type' })
    }

    if (result.error) {
      throw new Error(result.error)
    }

    // Log successful webhook processing
    await supabase
      .from('webhook_events')
      .insert({
        company_id: company.id,
        event_type: `veekaart.product.${eventType}`,
        event_data: productData,
        status: 'processed',
        response_status: 200,
        sent_at: new Date().toISOString()
      })

    return res.status(200).json({
      success: true,
      message: `Product ${eventType} processed successfully`,
      details: result
    })

  } catch (error) {
    console.error('VeeKaart product webhook error:', error)
    
    // Log failed webhook
    if (req.body && company?.id) {
      await supabase
        .from('webhook_events')
        .insert({
          company_id: company.id,
          event_type: `veekaart.product.${req.body.event_type || 'unknown'}`,
          event_data: req.body,
          status: 'failed',
          error_message: error.message,
          response_status: 500,
          sent_at: new Date().toISOString()
        })
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

async function handleSyncConfirmation(companyId, data) {
  try {
    const { products, sync_status, sync_timestamp } = data
    
    // Update metadata for synced products
    for (const product of products || []) {
      await supabase
        .from('items')
        .update({
          metadata: supabase.raw(`metadata || '{"veekaart_sync_status": "${sync_status}", "last_synced": "${sync_timestamp}", "veekaart_product_id": "${product.veekaart_product_id}"}'::jsonb`),
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId)
        .eq('item_code', product.sku)
    }

    return { 
      message: `Sync confirmation processed for ${products?.length || 0} products`,
      sync_status,
      products_count: products?.length || 0
    }

  } catch (error) {
    console.error('Error handling sync confirmation:', error)
    return { error: error.message }
  }
}

async function handleStockUpdate(companyId, data) {
  try {
    const { sku, stock_quantity, veekaart_product_id } = data
    
    if (!sku || stock_quantity === undefined) {
      throw new Error('SKU and stock_quantity are required')
    }

    // Find the item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('company_id', companyId)
      .eq('item_code', sku)
      .single()

    if (itemError || !item) {
      throw new Error(`Item with SKU ${sku} not found`)
    }

    // Calculate stock difference
    const currentStock = parseFloat(item.current_stock || 0)
    const newStock = parseFloat(stock_quantity)
    const stockDifference = newStock - currentStock

    if (stockDifference !== 0) {
      // Create inventory movement record
      await supabase
        .from('inventory_movements')
        .insert({
          company_id: companyId,
          item_id: item.id,
          item_code: sku,
          movement_type: 'adjustment',
          quantity: newStock, // For adjustments, quantity is the final stock level
          reference_type: 'veekaart_sync',
          reference_number: `VK-SYNC-${Date.now()}`,
          notes: `Stock updated from VeeKaart: ${currentStock} → ${newStock}`,
          movement_date: new Date().toISOString().split('T')[0]
        })

      // Update item metadata
      await supabase
        .from('items')
        .update({
          metadata: supabase.raw(`metadata || '{"last_veekaart_stock_sync": "${new Date().toISOString()}", "veekaart_product_id": "${veekaart_product_id || ''}"}'::jsonb`),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
    }

    return {
      message: 'Stock updated successfully',
      sku,
      old_stock: currentStock,
      new_stock: newStock,
      difference: stockDifference
    }

  } catch (error) {
    console.error('Error handling stock update:', error)
    return { error: error.message }
  }
}

async function handlePriceUpdate(companyId, data) {
  try {
    const { sku, selling_price, mrp, veekaart_product_id } = data
    
    if (!sku || selling_price === undefined) {
      throw new Error('SKU and selling_price are required')
    }

    // Find and update the item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('company_id', companyId)
      .eq('item_code', sku)
      .single()

    if (itemError || !item) {
      throw new Error(`Item with SKU ${sku} not found`)
    }

    const oldPrice = parseFloat(item.selling_price || 0)
    const newPrice = parseFloat(selling_price)

    // Update item prices
    const updateData = {
      selling_price: newPrice,
      updated_at: new Date().toISOString(),
      metadata: supabase.raw(`metadata || '{"last_veekaart_price_sync": "${new Date().toISOString()}", "veekaart_product_id": "${veekaart_product_id || ''}", "price_sync_history": "${JSON.stringify({old_price: oldPrice, new_price: newPrice, synced_at: new Date().toISOString()})}"}'::jsonb`)
    }

    if (mrp) {
      updateData.mrp = parseFloat(mrp)
    }

    const { error: updateError } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', item.id)

    if (updateError) {
      throw updateError
    }

    return {
      message: 'Price updated successfully',
      sku,
      old_price: oldPrice,
      new_price: newPrice,
      mrp: mrp ? parseFloat(mrp) : item.mrp
    }

  } catch (error) {
    console.error('Error handling price update:', error)
    return { error: error.message }
  }
}
