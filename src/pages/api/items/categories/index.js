// src/pages/api/items/categories/index.js - MANAGE CATEGORIES
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getCategories(req, res)
      case 'POST':
        return await createCategory(req, res)
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
  const { company_id, search, page = 1, limit = 50 } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Get from categories table (if it exists) or extract from items
    let query = supabaseAdmin
      .from('items')
      .select('category', { count: 'exact' })
      .eq('company_id', company_id)
      .is('deleted_at', null)
      .not('category', 'is', null)

    if (search) {
      query = query.ilike('category', `%${search}%`)
    }

    query = query.order('category')

    const { data: items, error } = await query

    if (error) {
      console.error('Error fetching categories:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch categories'
      })
    }

    // Extract unique categories with item count
    const categoryMap = {}
    items?.forEach(item => {
      if (item.category) {
        const cat = item.category.trim()
        categoryMap[cat] = (categoryMap[cat] || 0) + 1
      }
    })

    const categories = Object.entries(categoryMap).map(([name, count]) => ({
      value: name,
      label: name,
      item_count: count
    }))

    // Pagination
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const offset = (pageNum - 1) * limitNum
    const paginatedCategories = categories.slice(offset, offset + limitNum)
    const totalPages = Math.ceil(categories.length / limitNum)

    return res.status(200).json({
      success: true,
      data: paginatedCategories,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_records: categories.length,
        per_page: limitNum,
        has_next_page: pageNum < totalPages,
        has_prev_page: pageNum > 1
      }
    })

  } catch (error) {
    console.error('Error in getCategories:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    })
  }
}

async function createCategory(req, res) {
  // In a real scenario, this would create a categories table entry
  // For now, categories are just strings in the items table
  // This endpoint is here for future scalability
  
  const { company_id, name } = req.body

  if (!company_id || !name) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and category name are required'
    })
  }

  // Just return success - categories are managed through items
  return res.status(201).json({
    success: true,
    message: 'Category can be used in items',
    data: {
      value: name.trim(),
      label: name.trim(),
      item_count: 0
    }
  })
}

export default withAuth(handler)