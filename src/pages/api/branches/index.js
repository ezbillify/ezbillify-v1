// src/pages/api/branches/index.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  try {
    const { method } = req

    if (method === 'GET') {
      return await getBranches(req, res)
    } else if (method === 'POST') {
      return await createBranch(req, res)
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Branches API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getBranches(req, res) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'company_id is required'
    })
  }

  try {
    const { data: branches, error } = await supabase
      .from('branches')
      .select('*')
      .eq('company_id', company_id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching branches:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch branches'
      })
    }

    return res.status(200).json({
      success: true,
      data: branches || [],
      message: 'Branches retrieved successfully'
    })
  } catch (error) {
    console.error('Get branches error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch branches'
    })
  }
}

async function createBranch(req, res) {
  const { company_id, name, address, billing_address, phone, email, document_prefix } = req.body

  // Validate required fields
  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'company_id is required'
    })
  }

  if (!name || !document_prefix) {
    return res.status(400).json({
      success: false,
      error: 'name and document_prefix are required'
    })
  }

  try {
    // Check if company exists
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      return res.status(400).json({
        success: false,
        error: 'Company not found'
      })
    }

    // Check if document_prefix already exists for this company
    const { data: existingBranch, error: prefixError } = await supabase
      .from('branches')
      .select('id')
      .eq('company_id', company_id)
      .eq('document_prefix', document_prefix.toUpperCase())
      .single()

    if (!prefixError && existingBranch) {
      return res.status(400).json({
        success: false,
        error: 'Document prefix already exists for this company'
      })
    }

    // Create new branch
    const { data: newBranch, error: createError } = await supabase
      .from('branches')
      .insert([
        {
          company_id,
          name: name.trim(),
          address: address || {},
          billing_address: billing_address || {},
          phone: phone || null,
          email: email || null,
          document_prefix: document_prefix.toUpperCase(),
          document_number_counter: 1,
          is_active: true,
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('Error creating branch:', createError)
      return res.status(400).json({
        success: false,
        error: 'Failed to create branch: ' + createError.message
      })
    }

    console.log('✅ Branch created:', newBranch.id)

    return res.status(201).json({
      success: true,
      data: newBranch,
      message: 'Branch created successfully'
    })
  } catch (error) {
    console.error('Create branch error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create branch'
    })
  }
}