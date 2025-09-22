// pages/api/master-data/tax-rates/index.js
import { supabase } from '../../../../services/utils/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
}

async function handleGet(req, res) {
  try {
    const { company_id } = req.query

    if (!company_id) {
      return res.status(400).json({ success: false, error: 'Company ID is required' })
    }

    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .order('tax_name', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch tax rates' })
    }

    return res.status(200).json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handlePost(req, res) {
  try {
    const { company_id, tax_name, tax_type, tax_rate, cgst_rate, sgst_rate, igst_rate, cess_rate, is_default } = req.body

    if (!company_id || !tax_name || !tax_type || tax_rate === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company ID, tax name, tax type, and tax rate are required' 
      })
    }

    // If this is being set as default, unset others
    if (is_default) {
      await supabase
        .from('tax_rates')
        .update({ is_default: false })
        .eq('company_id', company_id)
    }

    const taxRateData = {
      company_id,
      tax_name,
      tax_type,
      tax_rate: parseFloat(tax_rate),
      cgst_rate: parseFloat(cgst_rate) || 0,
      sgst_rate: parseFloat(sgst_rate) || 0,
      igst_rate: parseFloat(igst_rate) || 0,
      cess_rate: parseFloat(cess_rate) || 0,
      is_default: is_default || false,
      is_active: true
    }

    const { data, error } = await supabase
      .from('tax_rates')
      .insert([taxRateData])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ success: false, error: 'Failed to create tax rate' })
    }

    return res.status(201).json({
      success: true,
      data: data,
      message: 'Tax rate created successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}