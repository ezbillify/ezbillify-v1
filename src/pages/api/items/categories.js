// src/pages/api/items/categories.js - NEW
import { supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getCategories(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Categories API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

async function getCategories(req, res) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Get distinct categories from items table
    const { data: items, error } = await supabaseAdmin
      .from('items')
      .select('category')
      .eq('company_id', company_id)
      .is('deleted_at', null)
      .not('category', 'is', null)
      .order('category')

    if (error) {
      console.error('Error fetching categories:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch categories'
      })
    }

    // Extract unique categories
    const uniqueCategories = [...new Set(items
      ?.map(item => item.category)
      .filter(cat => cat && cat.trim())
    )] || []

    // Format for dropdown
    const categories = uniqueCategories.map(cat => ({
      value: cat,
      label: cat
    }))

    return res.status(200).json({
      success: true,
      data: categories,
      total: categories.length
    })

  } catch (error) {
    console.error('Error in getCategories:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    })
  }
}

export default withAuth(handler)