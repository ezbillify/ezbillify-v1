// pages/api/settings/print-templates.js
import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side operations that bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export default async function handler(req, res) {
  console.log('📋 Print Templates API called:', req.method)
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getTemplates(req, res)
      case 'POST':
        return await saveTemplate(req, res)
      case 'PUT':
        return await updateTemplate(req, res)
      case 'DELETE':
        return await deleteTemplate(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('🚨 Print Templates API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getTemplates(req, res) {
  const { company_id } = req.query
  console.log('🔍 Loading templates for company:', company_id)

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Test database connection first
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', company_id)
      .single()

    if (companyError) {
      console.error('❌ Company lookup failed:', companyError)
      // Return empty array if database not available
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Database not connected - using empty data'
      })
    }

    console.log('✅ Company found:', company.name)

    // Fetch print templates
    const { data: templates, error } = await supabase
      .from('print_templates')
      .select('*')
      .eq('company_id', company_id)
      .order('document_type', { ascending: true })

    if (error) {
      console.error('❌ Error fetching templates:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch templates',
        details: error.message
      })
    }

    console.log(`✅ Found ${templates?.length || 0} templates`)

    return res.status(200).json({
      success: true,
      data: templates || []
    })

  } catch (error) {
    console.error('Error in getTemplates:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      details: error.message
    })
  }
}

async function saveTemplate(req, res) {
  const {
    company_id,
    template_name,
    document_type,
    template_type,
    template_html,
    paper_size,
    orientation,
    template_config,
    is_default,
    is_active
  } = req.body

  console.log('💾 Saving template:', {
    company_id,
    template_name,
    document_type,
    template_type,
    paper_size
  })

  if (!company_id || !document_type || !template_html) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, document type, and template HTML are required'
    })
  }

  try {
    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      })
    }

    // Check if template already exists for this document type AND paper size
    const { data: existingTemplate } = await supabase
      .from('print_templates')
      .select('id')
      .eq('company_id', company_id)
      .eq('document_type', document_type)
      .eq('paper_size', paper_size || 'A4')
      .maybeSingle()

    const templateData = {
      company_id,
      template_name: template_name || `${document_type} Template`,
      document_type,
      template_type: template_type || 'predefined',
      template_html,
      template_css: null,
      template_config: template_config || '{}',
      paper_size: paper_size || 'A4',
      orientation: orientation || 'portrait',
      is_default: is_default !== undefined ? is_default : true,
      is_active: is_active !== undefined ? is_active : true,
      updated_at: new Date().toISOString()
    }

    if (existingTemplate) {
      console.log('🔄 Updating existing template:', existingTemplate.id)
      
      const { data: updated, error: updateError } = await supabase
        .from('print_templates')
        .update(templateData)
        .eq('id', existingTemplate.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating template:', updateError)
        return res.status(500).json({
          success: false,
          error: 'Failed to update template',
          details: updateError.message
        })
      }

      console.log('✅ Template updated successfully')
      // Note: Clear print service cache on client side after this
      return res.status(200).json({
        success: true,
        message: 'Template updated successfully',
        data: updated,
        clearCache: true
      })
    } else {
      console.log('➕ Creating new template')
      
      templateData.created_at = new Date().toISOString()
      templateData.preview_image_url = null

      const { data: created, error: createError } = await supabase
        .from('print_templates')
        .insert(templateData)
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating template:', createError)
        return res.status(500).json({
          success: false,
          error: 'Failed to create template',
          details: createError.message
        })
      }

      console.log('✅ Template created successfully')
      // Note: Clear print service cache on client side after this
      return res.status(201).json({
        success: true,
        message: 'Template assigned successfully',
        data: created,
        clearCache: true
      })
    }

  } catch (error) {
    console.error('🚨 Error in saveTemplate:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to save template',
      details: error.message
    })
  }
}

async function updateTemplate(req, res) {
  const { template_id, updates } = req.body

  if (!template_id || !updates) {
    return res.status(400).json({
      success: false,
      error: 'Template ID and updates are required'
    })
  }

  try {
    const { data, error } = await supabase
      .from('print_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', template_id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update template',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: data
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update template',
      details: error.message
    })
  }
}

async function deleteTemplate(req, res) {
  const { template_id } = req.body

  if (!template_id) {
    return res.status(400).json({
      success: false,
      error: 'Template ID is required'
    })
  }

  try {
    const { error } = await supabase
      .from('print_templates')
      .delete()
      .eq('id', template_id)

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete template',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete template',
      details: error.message
    })
  }
}