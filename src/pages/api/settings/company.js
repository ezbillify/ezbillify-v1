// pages/api/settings/company.js
import { supabase } from '../../../lib/supabase'
import { withAuth } from '../../../lib/middleware/auth'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getCompanyProfile(req, res)
      case 'PUT':
        return await updateCompanyProfile(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Company settings API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getCompanyProfile(req, res) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', company_id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      })
    }
    
    console.error('Error fetching company profile:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch company profile'
    })
  }

  // Mask sensitive data
  const maskedCompany = {
    ...company,
    api_key: company.api_key ? '••••••••' + company.api_key.slice(-4) : null,
    webhook_secret: company.webhook_secret ? '••••••••' : null
  }

  return res.status(200).json({
    success: true,
    data: maskedCompany
  })
}

async function updateCompanyProfile(req, res) {
  const { company_id } = req.query
  const updateData = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if company exists
  const { data: existingCompany, error: fetchError } = await supabase
    .from('companies')
    .select('id, email')
    .eq('id', company_id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch company'
    })
  }

  // Validate email format if provided
  if (updateData.email && !isValidEmail(updateData.email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    })
  }

  // Validate GSTIN format if provided
  if (updateData.gstin && !isValidGSTIN(updateData.gstin)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid GSTIN format'
    })
  }

  // Validate PAN format if provided
  if (updateData.pan && !isValidPAN(updateData.pan)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid PAN format'
    })
  }

  // Check for duplicate email (if changing)
  if (updateData.email && updateData.email !== existingCompany.email) {
    const { data: duplicateCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('email', updateData.email)
      .neq('id', company_id)
      .single()

    if (duplicateCompany) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists for another company'
      })
    }
  }

  // Prepare update data
  const allowedFields = [
    'name', 'email', 'phone', 'address', 'billing_address', 'shipping_address',
    'gstin', 'pan', 'tan', 'cin', 'business_type', 'logo_url', 'letterhead_url',
    'billing_currency', 'timezone', 'financial_year_start', 'subscription_plan',
    'status', 'settings'
  ]

  const finalUpdateData = {}
  
  allowedFields.forEach(field => {
    if (updateData.hasOwnProperty(field)) {
      let value = updateData[field]
      
      // Type-specific processing
      if (['name', 'business_type'].includes(field) && value) {
        value = value.trim()
      } else if (field === 'email' && value) {
        value = value.toLowerCase().trim()
      } else if (['gstin', 'pan', 'tan', 'cin'].includes(field) && value) {
        value = value.toUpperCase().trim()
      }
      
      finalUpdateData[field] = value
    }
  })

  // Add timestamp
  finalUpdateData.updated_at = new Date().toISOString()

  const { data: updatedCompany, error: updateError } = await supabase
    .from('companies')
    .update(finalUpdateData)
    .eq('id', company_id)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating company profile:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update company profile'
    })
  }

  // Mask sensitive data in response
  const maskedCompany = {
    ...updatedCompany,
    api_key: updatedCompany.api_key ? '••••••••' + updatedCompany.api_key.slice(-4) : null,
    webhook_secret: updatedCompany.webhook_secret ? '••••••••' : null
  }

  return res.status(200).json({
    success: true,
    message: 'Company profile updated successfully',
    data: maskedCompany
  })
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidGSTIN(gstin) {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return gstinRegex.test(gstin)
}

function isValidPAN(pan) {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  return panRegex.test(pan)
}

export default withAuth(handler)