// pages/api/master-data/units/index.js
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

    // Get both global units (company_id IS NULL) and company-specific units
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .or(`company_id.is.null,company_id.eq.${company_id}`)
      .eq('is_active', true)
      .order('unit_name', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch units' })
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
    const { company_id, unit_name, unit_symbol, unit_type, base_unit_id, conversion_factor } = req.body

    if (!company_id || !unit_name || !unit_symbol) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company ID, unit name, and unit symbol are required' 
      })
    }

    const unitData = {
      company_id,
      unit_name,
      unit_symbol: unit_symbol.toUpperCase(),
      unit_type: unit_type || 'custom',
      base_unit_id: base_unit_id || null,
      conversion_factor: conversion_factor ? parseFloat(conversion_factor) : 1,
      is_active: true
    }

    const { data, error } = await supabase
      .from('units')
      .insert([unitData])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ success: false, error: 'Failed to create unit' })
    }

    return res.status(201).json({
      success: true,
      data: data,
      message: 'Unit created successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
