import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  if (method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { company_id, from_date, to_date, report_type } = req.query

  if (!company_id || !from_date || !to_date || !report_type) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, from date, to date, and report type are required'
    })
  }

  try {
    switch (report_type) {
      case 'stock_summary':
        return await getStockSummary(req, res, company_id, from_date, to_date)
      case 'stock_movement':
        return await getStockMovement(req, res, company_id, from_date, to_date)
      case 'low_stock':
        return await getLowStockReport(req, res, company_id)
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid report type. Supported types: stock_summary, stock_movement, low_stock'
        })
    }
  } catch (error) {
    console.error('Inventory Reports API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate inventory report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Stock summary report
async function getStockSummary(req, res, company_id, from_date, to_date) {
  try {
    // Get all products with their current stock levels
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        sku,
        unit,
        current_stock,
        purchase_price,
        selling_price
      `)
      .eq('company_id', company_id)
      .order('name')

    if (productsError) throw productsError

    // Calculate stock value
    const productsWithValues = products.map(product => ({
      ...product,
      stock_value: (product.current_stock || 0) * (product.purchase_price || 0)
    }))

    // Sort by stock value (highest first)
    productsWithValues.sort((a, b) => b.stock_value - a.stock_value)

    return res.status(200).json({
      success: true,
      data: {
        period: {
          from: from_date,
          to: to_date
        },
        report_type: 'stock_summary',
        products: productsWithValues,
        summary: {
          total_products: productsWithValues.length,
          total_stock: productsWithValues.reduce((sum, product) => sum + (product.current_stock || 0), 0),
          total_value: productsWithValues.reduce((sum, product) => sum + (product.stock_value || 0), 0)
        }
      }
    })
  } catch (error) {
    throw error
  }
}

// Stock movement report
async function getStockMovement(req, res, company_id, from_date, to_date) {
  try {
    // Get stock movements within the date range
    const { data: movements, error: movementsError } = await supabaseAdmin
      .from('stock_movements')
      .select(`
        id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        created_at,
        product_id,
        product:products(name, sku)
      `)
      .eq('company_id', company_id)
      .gte('created_at', from_date)
      .lte('created_at', to_date)
      .order('created_at')

    if (movementsError) throw movementsError

    // Group by product
    const productMovements = {}
    movements.forEach(movement => {
      const productId = movement.product_id
      if (!productMovements[productId]) {
        productMovements[productId] = {
          product_id: productId,
          product_name: movement.product?.name || 'Unknown Product',
          product_sku: movement.product?.sku || 'N/A',
          movements: [],
          total_in: 0,
          total_out: 0,
          net_movement: 0
        }
      }
      
      productMovements[productId].movements.push({
        movement_id: movement.id,
        movement_type: movement.movement_type,
        quantity: movement.quantity,
        reference_type: movement.reference_type,
        reference_id: movement.reference_id,
        created_at: movement.created_at
      })
      
      if (movement.movement_type === 'in') {
        productMovements[productId].total_in += movement.quantity || 0
      } else {
        productMovements[productId].total_out += movement.quantity || 0
      }
      
      productMovements[productId].net_movement = 
        productMovements[productId].total_in - productMovements[productId].total_out
    })

    // Convert to array and sort by net movement
    const productMovementsArray = Object.values(productMovements)
    productMovementsArray.sort((a, b) => Math.abs(b.net_movement) - Math.abs(a.net_movement))

    return res.status(200).json({
      success: true,
      data: {
        period: {
          from: from_date,
          to: to_date
        },
        report_type: 'stock_movement',
        products: productMovementsArray,
        summary: {
          total_movements: movements.length,
          total_products: productMovementsArray.length
        }
      }
    })
  } catch (error) {
    throw error
  }
}

// Low stock report
async function getLowStockReport(req, res, company_id) {
  try {
    // Get products with low stock (current_stock < min_stock_level)
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        sku,
        current_stock,
        min_stock_level,
        unit
      `)
      .eq('company_id', company_id)
      .lt('current_stock', 'min_stock_level')
      .order('current_stock')

    if (productsError) throw productsError

    return res.status(200).json({
      success: true,
      data: {
        report_type: 'low_stock',
        products: products,
        summary: {
          total_low_stock: products.length
        }
      }
    })
  } catch (error) {
    throw error
  }
}

export default withAuth(handler)