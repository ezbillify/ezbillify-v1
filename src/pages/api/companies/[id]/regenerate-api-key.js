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

  try {
    const { id: company_id } = req.query

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      })
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      })
    }

    // Generate new credentials
    const api_key = `ez_${crypto.randomBytes(32).toString('hex')}`
    const webhook_secret = crypto.randomBytes(32).toString('hex')

    // Update company with new credentials
    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update({
        api_key,
        webhook_secret,
        api_key_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', company_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating company:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to generate credentials'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'API credentials generated successfully',
      data: {
        api_key,
        webhook_secret,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in regenerate-api-key:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}