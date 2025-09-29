// pages/api/companies/[id]/regenerate-api-key.js
import { supabase } from '../../../../services/utils/supabase'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Generate new API key and webhook secret
    const newApiKey = crypto.randomBytes(32).toString('hex')
    const newWebhookSecret = crypto.randomBytes(32).toString('hex')

    // Update company with new keys
    const { data: company, error } = await supabase
      .from('companies')
      .update({
        api_key: newApiKey,
        webhook_secret: newWebhookSecret,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating API keys:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to regenerate API keys'
      })
    }

    // Log the API key regeneration
    await supabase
      .from('audit_logs')
      .insert({
        company_id: id,
        action: 'api_key_regenerated',
        resource_type: 'company',
        resource_id: id,
        description: 'API keys regenerated for security',
        ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        created_at: new Date().toISOString()
      })

    return res.status(200).json({
      success: true,
      message: 'API keys regenerated successfully',
      data: {
        api_key: newApiKey,
        webhook_secret: newWebhookSecret
      }
    })

  } catch (err) {
    console.error('API Key regeneration error:', err)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}