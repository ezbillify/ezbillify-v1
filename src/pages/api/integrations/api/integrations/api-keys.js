// pages/api/integrations/api/integrations/api-keys.js
import { supabase } from '../../../../../services/utils/supabase'
import { withAuth } from '../../../../../lib/middleware'
import crypto from 'crypto'

async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        return await getApiKeys(req, res)
      case 'POST':
        return await createApiKey(req, res)
      case 'PUT':
        return await updateApiKey(req, res)
      case 'DELETE':
        return await deleteApiKey(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('API Keys endpoint error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getApiKeys(req, res) {
  const company_id = req.auth.company.id // Get from authenticated user

  try {
    // Get company API keys
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, api_key, webhook_secret')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      })
    }

    // Get integration-specific API keys
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations')
      .select('id, integration_name, integration_type, api_key_encrypted, created_at, last_sync, is_active')
      .eq('company_id', company_id)

    if (integrationsError) {
      console.error('Error fetching integrations:', integrationsError)
    }

    // Get custom API keys created for this company
    const { data: customApiKeys, error: customKeysError } = await supabase
      .from('api_keys')
      .select('id, name, permissions, expires_at, is_active, created_at, updated_at, last_used_at')
      .eq('company_id', company_id)
      .order('created_at', { ascending: false })

    if (customKeysError) {
      console.error('Error fetching custom API keys:', customKeysError)
    }

    return res.status(200).json({
      success: true,
      data: {
        company: {
          id: company.id,
          name: company.name,
          api_key: company.api_key,
          webhook_secret: company.webhook_secret
        },
        integrations: integrations || [],
        custom_api_keys: customApiKeys || []
      }
    })

  } catch (error) {
    console.error('Error fetching API keys:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys'
    })
  }
}

async function createApiKey(req, res) {
  const company_id = req.auth.company.id // Get from authenticated user
  const { name, permissions = {}, expires_at = null } = req.body

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Name is required'
    })
  }

  try {
    // Generate new API key
    const apiKey = `ezb_${crypto.randomBytes(32).toString('hex')}`
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex')

    // Create API key record
    const { data: newApiKey, error } = await supabase
      .from('api_keys')
      .insert({
        company_id,
        name,
        key_hash: hashedKey,
        permissions: JSON.stringify(permissions),
        expires_at,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating API key:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create API key'
      })
    }

    // Log API key creation
    await supabase
      .from('audit_logs')
      .insert({
        company_id,
        user_id: req.auth.user.id,
        action: 'api_key_created',
        resource_type: 'api_key',
        resource_id: newApiKey.id,
        description: `API key "${name}" created`,
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        created_at: new Date().toISOString()
      })

    return res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: {
        id: newApiKey.id,
        name: newApiKey.name,
        api_key: apiKey, // Only return once during creation
        permissions: permissions,
        expires_at: newApiKey.expires_at,
        created_at: newApiKey.created_at
      }
    })

  } catch (error) {
    console.error('Error creating API key:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create API key'
    })
  }
}

async function updateApiKey(req, res) {
  const company_id = req.auth.company.id // Get from authenticated user
  const { key_id, name, permissions, is_active } = req.body

  if (!key_id) {
    return res.status(400).json({
      success: false,
      error: 'Key ID is required'
    })
  }

  try {
    // First check if API key exists and belongs to this company
    const { data: existingKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', key_id)
      .eq('company_id', company_id)
      .single()

    if (fetchError || !existingKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      })
    }

    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (name) updateData.name = name
    if (permissions) updateData.permissions = JSON.stringify(permissions)
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updatedKey, error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', key_id)
      .eq('company_id', company_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating API key:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update API key'
      })
    }

    // Log API key update
    await supabase
      .from('audit_logs')
      .insert({
        company_id: updatedKey.company_id,
        user_id: req.auth.user.id,
        action: 'api_key_updated',
        resource_type: 'api_key',
        resource_id: updatedKey.id,
        description: `API key "${updatedKey.name}" updated`,
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        created_at: new Date().toISOString()
      })

    return res.status(200).json({
      success: true,
      message: 'API key updated successfully',
      data: {
        id: updatedKey.id,
        name: updatedKey.name,
        permissions: JSON.parse(updatedKey.permissions || '{}'),
        is_active: updatedKey.is_active,
        updated_at: updatedKey.updated_at
      }
    })

  } catch (error) {
    console.error('Error updating API key:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update API key'
    })
  }
}

async function deleteApiKey(req, res) {
  const company_id = req.auth.company.id // Get from authenticated user
  const { key_id } = req.body

  if (!key_id) {
    return res.status(400).json({
      success: false,
      error: 'Key ID is required'
    })
  }

  try {
    // Get API key details before deletion and verify ownership
    const { data: apiKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', key_id)
      .eq('company_id', company_id)
      .single()

    if (fetchError || !apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      })
    }

    // Delete API key
    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', key_id)
      .eq('company_id', company_id)

    if (deleteError) {
      console.error('Error deleting API key:', deleteError)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete API key'
      })
    }

    // Log API key deletion
    await supabase
      .from('audit_logs')
      .insert({
        company_id: apiKey.company_id,
        user_id: req.auth.user.id,
        action: 'api_key_deleted',
        resource_type: 'api_key',
        resource_id: apiKey.id,
        description: `API key "${apiKey.name}" deleted`,
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        created_at: new Date().toISOString()
      })

    return res.status(200).json({
      success: true,
      message: 'API key deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting API key:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete API key'
    })
  }
}

// Export with authentication wrapper
export default withAuth(handler)