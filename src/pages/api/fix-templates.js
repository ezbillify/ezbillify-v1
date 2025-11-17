// API endpoint to fix templates - update double braces to triple braces for addresses
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
    // Fetch all templates for this company
    const { data: templates, error: fetchError } = await supabase
      .from('print_templates')
      .select('*')
      .eq('company_id', company_id)
      .eq('paper_size', '80mm')

    if (fetchError) {
      return res.status(500).json({ success: false, error: 'Failed to fetch templates', details: fetchError.message })
    }

    console.log(`Found ${templates.length} 80mm templates to update`)

    const updates = []

    for (const template of templates) {
      let updatedHTML = template.template_html

      // Fix 1: Change double braces to triple braces for addresses
      updatedHTML = updatedHTML.replace(/{{COMPANY_ADDRESS}}/g, '{{{COMPANY_ADDRESS}}}')
      updatedHTML = updatedHTML.replace(/{{BRANCH_ADDRESS}}/g, '{{{BRANCH_ADDRESS}}}')
      updatedHTML = updatedHTML.replace(/{{CUSTOMER_ADDRESS}}/g, '{{{CUSTOMER_ADDRESS}}}')

      // Fix 2: Update branch conditional from BRANCH_ADDRESS to BRANCH_NAME
      updatedHTML = updatedHTML.replace(
        /{{#if BRANCH_ADDRESS}}\s*<div class="section">/g,
        '{{#if BRANCH_NAME}}\n  <div class="section">'
      )

      // Fix 3: Make CUSTOMER_NAME conditional
      updatedHTML = updatedHTML.replace(
        /<div class="bold">{{CUSTOMER_NAME}}<\/div>/g,
        '{{#if CUSTOMER_NAME}}<div class="bold">{{CUSTOMER_NAME}}</div>{{/if}}'
      )

      // Fix 4: Make CUSTOMER_ADDRESS conditional with triple braces
      updatedHTML = updatedHTML.replace(
        /<div>{{CUSTOMER_ADDRESS}}<\/div>/g,
        '{{#if CUSTOMER_ADDRESS}}<div>{{{CUSTOMER_ADDRESS}}}</div>{{/if}}'
      )

      // Fix 5: Make BRANCH_ADDRESS conditional with triple braces (in the branch section)
      updatedHTML = updatedHTML.replace(
        /<div>{{BRANCH_ADDRESS}}<\/div>/g,
        '{{#if BRANCH_ADDRESS}}<div>{{{BRANCH_ADDRESS}}}</div>{{/if}}'
      )

      // Update the template in database
      const { error: updateError } = await supabase
        .from('print_templates')
        .update({
          template_html: updatedHTML,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id)

      if (updateError) {
        console.error(`Failed to update template ${template.id}:`, updateError)
        updates.push({ id: template.id, success: false, error: updateError.message })
      } else {
        console.log(`✅ Updated template ${template.id}: ${template.template_name}`)
        updates.push({ id: template.id, name: template.template_name, success: true })
      }
    }

    return res.status(200).json({
      success: true,
      message: `Updated ${updates.filter(u => u.success).length} of ${templates.length} templates`,
      updates
    })

  } catch (error) {
    console.error('Error fixing templates:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fix templates',
      details: error.message
    })
  }
}
