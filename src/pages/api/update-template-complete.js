// API endpoint to completely rewrite the 80mm template with corrected syntax
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({ success: false, error: 'Company ID is required' })
  }

  try {
    // Read the corrected template from the file system
    const templatePath = path.join(process.cwd(), 'public', 'templates', '80mm-detailed.html')
    const templateHTML = fs.readFileSync(templatePath, 'utf-8')

    console.log('📄 Read template from file, length:', templateHTML.length)

    // Update all 80mm invoice templates for this company
    const { data: updated, error: updateError } = await supabase
      .from('print_templates')
      .update({
        template_html: templateHTML,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', company_id)
      .eq('document_type', 'invoice')
      .eq('paper_size', '80mm')
      .select()

    if (updateError) {
      console.error('❌ Error updating templates:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update templates',
        details: updateError.message
      })
    }

    console.log(`✅ Updated ${updated?.length || 0} templates`)

    return res.status(200).json({
      success: true,
      message: `Updated ${updated?.length || 0} templates with corrected HTML from file`,
      updated: updated
    })

  } catch (error) {
    console.error('Error updating templates:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update templates',
      details: error.message
    })
  }
}
