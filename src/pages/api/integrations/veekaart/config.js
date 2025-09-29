// pages/api/integrations/veekaart/config.js
import { supabase } from '../../../../lib/supabase'
import { withAuth } from '../../../../lib/middleware/auth'

async function handler(req, res) {
  const { method } = req
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getVeeKaartConfig(req, res, company_id)
      case 'POST':
        return await createVeeKaartConfig(req, res)
      case 'PUT':
        return await updateVeeKaartConfig(req, res)
      case 'DELETE':
        return await deleteVeeKaartConfig(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('VeeKaart config API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getVeeKaartConfig(req, res, company_id) {
  // Get VeeKaart integration configuration
  const { data: integration, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('company_id', company_id)
    .eq('integration_type', 'veekaart')
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching VeeKaart config:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch VeeKaart configuration'
    })
  }

  if (!integration) {
    // Return default configuration
    return res.status(200).json({
      success: true,
      data: {
        integration_type: 'veekaart',
        integration_name: 'VeeKaart E-commerce',
        is_active: false,
        status: 'not_configured',
        api_config: {
          api_url: '',
          api_key: '',
          api_secret: '',
          webhook_secret: ''
        },
        sync_config: {
          auto_sync_enabled: true,
          sync_interval: 30, // minutes
          retry_attempts: 3,
          timeout: 300, // seconds
          enable_product_sync: true,
          enable_customer_sync: true,
          enable_order_sync: true,
          enable_inventory_sync: true,
          stock_sync_direction: 'ez_to_vk', // ez_to_vk, vk_to_ez, bidirectional
          order_auto_invoice: true,
          order_auto_inventory_deduct: true,
          customer_auto_create: true,
          customer_type: 'b2c'
        },
        field_mappings: getDefaultFieldMappings(),
        webhook_endpoints: generateWebhookEndpoints(),
        last_sync: null,
        created_at: null,
        updated_at: null
      }
    })
  }

  // Return existing configuration
  const config = {
    ...integration,
    api_config: {
      ...integration.api_config,
      // Don't expose sensitive data in full
      api_key: integration.api_config?.api_key ? '••••••••' + (integration.api_config.api_key || '').slice(-4) : '',
      api_secret: integration.api_config?.api_secret ? '••••••••' + (integration.api_config.api_secret || '').slice(-4) : '',
      webhook_secret: integration.api_config?.webhook_secret ? '••••••••' : ''
    },
    sync_config: {
      auto_sync_enabled: true,
      sync_interval: 30,
      retry_attempts: 3,
      timeout: 300,
      enable_product_sync: true,
      enable_customer_sync: true,
      enable_order_sync: true,
      enable_inventory_sync: true,
      stock_sync_direction: 'ez_to_vk',
      order_auto_invoice: true,
      order_auto_inventory_deduct: true,
      customer_auto_create: true,
      customer_type: 'b2c',
      ...(integration.sync_settings || {})
    },
    field_mappings: integration.field_mappings || getDefaultFieldMappings(),
    webhook_endpoints: generateWebhookEndpoints()
  }

  return res.status(200).json({
    success: true,
    data: config
  })
}

async function createVeeKaartConfig(req, res) {
  const { company_id, api_config, sync_config, field_mappings } = req.body

  if (!company_id || !api_config) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and API configuration are required'
    })
  }

  // Validate API configuration
  const validationErrors = validateApiConfig(api_config)
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: validationErrors
    })
  }

  // Check if integration already exists
  const { data: existing } = await supabase
    .from('integrations')
    .select('id')
    .eq('company_id', company_id)
    .eq('integration_type', 'veekaart')
    .single()

  if (existing) {
    return res.status(400).json({
      success: false,
      error: 'VeeKaart integration already exists. Use PUT to update.'
    })
  }

  // Test API connection before saving
  const connectionTest = await testVeeKaartConnection(api_config)
  if (!connectionTest.success) {
    return res.status(400).json({
      success: false,
      error: 'API connection test failed',
      details: connectionTest.error
    })
  }

  // Create integration record
  const integrationData = {
    company_id,
    integration_type: 'veekaart',
    integration_name: 'VeeKaart E-commerce',
    api_endpoint: api_config.api_url,
    api_config: {
      api_url: api_config.api_url,
      api_key: api_config.api_key,
      api_secret: api_config.api_secret,
      webhook_secret: api_config.webhook_secret || generateWebhookSecret()
    },
    sync_settings: {
      auto_sync_enabled: true,
      sync_interval: 30,
      retry_attempts: 3,
      timeout: 300,
      enable_product_sync: true,
      enable_customer_sync: true,
      enable_order_sync: true,
      enable_inventory_sync: true,
      stock_sync_direction: 'ez_to_vk',
      order_auto_invoice: true,
      order_auto_inventory_deduct: true,
      customer_auto_create: true,
      customer_type: 'b2c',
      ...(sync_config || {})
    },
    field_mappings: field_mappings || getDefaultFieldMappings(),
    is_active: true,
    status: 'connected',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: integration, error } = await supabase
    .from('integrations')
    .insert(integrationData)
    .select()
    .single()

  if (error) {
    console.error('Error creating VeeKaart integration:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create VeeKaart integration'
    })
  }

  return res.status(201).json({
    success: true,
    message: 'VeeKaart integration created successfully',
    data: {
      ...integration,
      webhook_endpoints: generateWebhookEndpoints()
    }
  })
}

async function updateVeeKaartConfig(req, res) {
  const { company_id, api_config, sync_config, field_mappings, is_active } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Get existing integration
  const { data: existing, error: fetchError } = await supabase
    .from('integrations')
    .select('*')
    .eq('company_id', company_id)
    .eq('integration_type', 'veekaart')
    .single()

  if (fetchError || !existing) {
    return res.status(404).json({
      success: false,
      error: 'VeeKaart integration not found'
    })
  }

  // Prepare update data
  const updateData = {
    updated_at: new Date().toISOString()
  }

  // Update API config if provided
  if (api_config) {
    const validationErrors = validateApiConfig(api_config)
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      })
    }

    // Test connection if API details changed
    const apiChanged = 
      api_config.api_url !== existing.api_config?.api_url ||
      api_config.api_key !== existing.api_config?.api_key ||
      api_config.api_secret !== existing.api_config?.api_secret

    if (apiChanged) {
      const connectionTest = await testVeeKaartConnection(api_config)
      if (!connectionTest.success) {
        return res.status(400).json({
          success: false,
          error: 'API connection test failed',
          details: connectionTest.error
        })
      }
      updateData.status = 'connected'
    }

    updateData.api_endpoint = api_config.api_url
    updateData.api_config = {
      ...existing.api_config,
      api_url: api_config.api_url,
      api_key: api_config.api_key,
      api_secret: api_config.api_secret,
      webhook_secret: api_config.webhook_secret || existing.api_config?.webhook_secret || generateWebhookSecret()
    }
  }

  // Update sync config if provided
  if (sync_config) {
    updateData.sync_settings = {
      ...existing.sync_settings,
      ...sync_config
    }
  }

  // Update field mappings if provided
  if (field_mappings) {
    updateData.field_mappings = field_mappings
  }

  // Update active status if provided
  if (typeof is_active === 'boolean') {
    updateData.is_active = is_active
    if (!is_active) {
      updateData.status = 'disabled'
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('integrations')
    .update(updateData)
    .eq('id', existing.id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating VeeKaart integration:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update VeeKaart integration'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'VeeKaart integration updated successfully',
    data: {
      ...updated,
      webhook_endpoints: generateWebhookEndpoints()
    }
  })
}

async function deleteVeeKaartConfig(req, res) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Find integration
  const { data: integration, error: fetchError } = await supabase
    .from('integrations')
    .select('id')
    .eq('company_id', company_id)
    .eq('integration_type', 'veekaart')
    .single()

  if (fetchError || !integration) {
    return res.status(404).json({
      success: false,
      error: 'VeeKaart integration not found'
    })
  }

  // Delete integration (this will cascade delete related records)
  const { error: deleteError } = await supabase
    .from('integrations')
    .delete()
    .eq('id', integration.id)

  if (deleteError) {
    console.error('Error deleting VeeKaart integration:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete VeeKaart integration'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'VeeKaart integration deleted successfully'
  })
}

// Helper functions

function validateApiConfig(apiConfig) {
  const errors = []

  if (!apiConfig.api_url) {
    errors.push('API URL is required')
  } else if (!isValidUrl(apiConfig.api_url)) {
    errors.push('API URL must be a valid URL')
  }

  if (!apiConfig.api_key) {
    errors.push('API Key is required')
  } else if (apiConfig.api_key.length < 10) {
    errors.push('API Key must be at least 10 characters')
  }

  if (!apiConfig.api_secret) {
    errors.push('API Secret is required')
  } else if (apiConfig.api_secret.length < 10) {
    errors.push('API Secret must be at least 10 characters')
  }

  return errors
}

function isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

async function testVeeKaartConnection(apiConfig) {
  try {
    const response = await fetch(`${apiConfig.api_url}/api/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiConfig.api_key}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    })

    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        data: data
      }
    } else {
      return {
        success: false,
        error: `API returned status ${response.status}`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

function generateWebhookSecret() {
  const crypto = require('crypto')
  return crypto.randomBytes(32).toString('hex')
}

function generateWebhookEndpoints() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
  
  return {
    order_created: `${baseUrl}/api/integrations/veekaart/webhook`,
    order_confirmed: `${baseUrl}/api/integrations/veekaart/webhook`,
    order_cancelled: `${baseUrl}/api/integrations/veekaart/webhook`,
    customer_created: `${baseUrl}/api/integrations/veekaart/webhook`,
    customer_updated: `${baseUrl}/api/integrations/veekaart/webhook`,
    product_updated: `${baseUrl}/api/integrations/veekaart/webhook`,
    product_stock_changed: `${baseUrl}/api/integrations/veekaart/webhook`
  }
}

function getDefaultFieldMappings() {
  return {
    product_mapping: {
      veekaart_field: 'ezbillify_field',
      id: 'veekaart_product_id',
      name: 'item_name',
      sku: 'item_code',
      price: 'selling_price',
      description: 'description',
      category: 'category',
      stock_quantity: 'current_stock',
      status: 'is_active',
      hsn_code: 'hsn_sac_code'
    },
    customer_mapping: {
      id: 'veekaart_customer_id',
      name: 'name',
      first_name: 'first_name',
      last_name: 'last_name',
      email: 'email',
      phone: 'phone',
      mobile: 'mobile',
      customer_code: 'customer_code',
      billing_address: 'billing_address',
      shipping_address: 'shipping_address',
      status: 'status'
    },
    order_mapping: {
      id: 'veekaart_order_id',
      order_number: 'veekaart_order_number',
      order_date: 'document_date',
      subtotal: 'subtotal',
      tax_amount: 'tax_amount',
      total_amount: 'total_amount',
      payment_status: 'payment_status',
      billing_address: 'billing_address',
      shipping_address: 'shipping_address',
      customer: 'customer_id'
    },
    order_item_mapping: {
      product_id: 'item_id',
      sku: 'item_code',
      name: 'item_name',
      quantity: 'quantity',
      price: 'rate',
      line_total: 'total_amount',
      tax_rate: 'tax_rate',
      discount_amount: 'discount_amount'
    }
  }
}

export default withAuth(handler)