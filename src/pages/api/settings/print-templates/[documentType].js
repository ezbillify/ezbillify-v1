// pages/api/settings/print-templates/[documentType].js
import { supabaseAdmin } from '../../../../services/utils/supabase'

export default async function handler(req, res) {
  const { documentType } = req.query
  const { company_id } = req.query

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  if (!company_id || !documentType) {
    return res.status(400).json({ 
      success: false, 
      error: 'Company ID and document type are required' 
    })
  }

  try {
    // Get template for specific document type and company
    const { data, error } = await supabaseAdmin
      .from('print_templates')
      .select('*')
      .eq('company_id', company_id)
      .eq('document_type', documentType)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch template' 
      })
    }

    if (!data) {
      // No custom template found, return success with no data
      return res.status(200).json({ 
        success: true, 
        data: null 
      })
    }

    return res.status(200).json({ 
      success: true, 
      data 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    })
  }
}