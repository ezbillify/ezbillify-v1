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
      case 'supplier_wise':
        return await getSupplierWisePurchases(req, res, company_id, from_date, to_date)
      case 'bill_wise':
        return await getBillWisePurchases(req, res, company_id, from_date, to_date)
      case 'product_wise':
        return await getProductWisePurchases(req, res, company_id, from_date, to_date)
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid report type. Supported types: supplier_wise, bill_wise, product_wise'
        })
    }
  } catch (error) {
    console.error('Purchase Reports API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate purchase report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Supplier-wise purchase report
async function getSupplierWisePurchases(req, res, company_id, from_date, to_date) {
  try {
    // Get purchase invoices within the date range
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('purchase_invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        supplier_id,
        supplier:suppliers(name),
        total_amount,
        tax_amount,
        grand_total
      `)
      .eq('company_id', company_id)
      .gte('invoice_date', from_date)
      .lte('invoice_date', to_date)
      .order('supplier_id')

    if (invoicesError) throw invoicesError

    // Group by supplier
    const supplierPurchases = {}
    invoices.forEach(invoice => {
      const supplierId = invoice.supplier_id
      if (!supplierPurchases[supplierId]) {
        supplierPurchases[supplierId] = {
          supplier_id: supplierId,
          supplier_name: invoice.supplier?.name || 'Unknown Supplier',
          invoices: [],
          total_amount: 0,
          tax_amount: 0,
          grand_total: 0
        }
      }
      
      supplierPurchases[supplierId].invoices.push({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        total_amount: invoice.total_amount,
        tax_amount: invoice.tax_amount,
        grand_total: invoice.grand_total
      })
      
      supplierPurchases[supplierId].total_amount += invoice.total_amount || 0
      supplierPurchases[supplierId].tax_amount += invoice.tax_amount || 0
      supplierPurchases[supplierId].grand_total += invoice.grand_total || 0
    })

    // Convert to array and sort by grand total
    const supplierPurchasesArray = Object.values(supplierPurchases)
    supplierPurchasesArray.sort((a, b) => b.grand_total - a.grand_total)

    return res.status(200).json({
      success: true,
      data: {
        period: {
          from: from_date,
          to: to_date
        },
        report_type: 'supplier_wise',
        suppliers: supplierPurchasesArray,
        summary: {
          total_invoices: invoices.length,
          total_amount: supplierPurchasesArray.reduce((sum, supplier) => sum + supplier.total_amount, 0),
          total_tax: supplierPurchasesArray.reduce((sum, supplier) => sum + supplier.tax_amount, 0),
          total_grand: supplierPurchasesArray.reduce((sum, supplier) => sum + supplier.grand_total, 0)
        }
      }
    })
  } catch (error) {
    throw error
  }
}

// Bill-wise purchase report
async function getBillWisePurchases(req, res, company_id, from_date, to_date) {
  try {
    // Get purchase invoices within the date range
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('purchase_invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        supplier_id,
        supplier:suppliers(name),
        total_amount,
        tax_amount,
        grand_total,
        status
      `)
      .eq('company_id', company_id)
      .gte('invoice_date', from_date)
      .lte('invoice_date', to_date)
      .order('invoice_date')

    if (invoicesError) throw invoicesError

    return res.status(200).json({
      success: true,
      data: {
        period: {
          from: from_date,
          to: to_date
        },
        report_type: 'bill_wise',
        invoices: invoices,
        summary: {
          total_invoices: invoices.length,
          total_amount: invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0),
          total_tax: invoices.reduce((sum, invoice) => sum + (invoice.tax_amount || 0), 0),
          total_grand: invoices.reduce((sum, invoice) => sum + (invoice.grand_total || 0), 0)
        }
      }
    })
  } catch (error) {
    throw error
  }
}

// Product-wise purchase report
async function getProductWisePurchases(req, res, company_id, from_date, to_date) {
  try {
    // Get purchase invoice items within the date range
    const { data: invoiceItems, error: itemsError } = await supabaseAdmin
      .from('purchase_invoice_items')
      .select(`
        product_id,
        product:products(name),
        quantity,
        unit_price,
        total_amount,
        invoice:purchase_invoices(
          invoice_date,
          supplier:suppliers(name)
        )
      `)
      .eq('purchase_invoices.company_id', company_id)
      .gte('purchase_invoices.invoice_date', from_date)
      .lte('purchase_invoices.invoice_date', to_date)

    if (itemsError) throw itemsError

    // Group by product
    const productPurchases = {}
    invoiceItems.forEach(item => {
      const productId = item.product_id
      if (!productPurchases[productId]) {
        productPurchases[productId] = {
          product_id: productId,
          product_name: item.product?.name || 'Unknown Product',
          items: [],
          total_quantity: 0,
          total_amount: 0
        }
      }
      
      productPurchases[productId].items.push({
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        invoice_date: item.invoice?.invoice_date,
        supplier_name: item.invoice?.supplier?.name || 'Unknown Supplier'
      })
      
      productPurchases[productId].total_quantity += item.quantity || 0
      productPurchases[productId].total_amount += item.total_amount || 0
    })

    // Convert to array and sort by total amount
    const productPurchasesArray = Object.values(productPurchases)
    productPurchasesArray.sort((a, b) => b.total_amount - a.total_amount)

    return res.status(200).json({
      success: true,
      data: {
        period: {
          from: from_date,
          to: to_date
        },
        report_type: 'product_wise',
        products: productPurchasesArray,
        summary: {
          total_products: productPurchasesArray.length,
          total_quantity: productPurchasesArray.reduce((sum, product) => sum + product.total_quantity, 0),
          total_amount: productPurchasesArray.reduce((sum, product) => sum + product.total_amount, 0)
        }
      }
    })
  } catch (error) {
    throw error
  }
}

export default withAuth(handler)