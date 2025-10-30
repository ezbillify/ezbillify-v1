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
      case 'customer_wise':
        return await getCustomerWiseSales(req, res, company_id, from_date, to_date)
      case 'bill_wise':
        return await getBillWiseSales(req, res, company_id, from_date, to_date)
      case 'product_wise':
        return await getProductWiseSales(req, res, company_id, from_date, to_date)
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid report type. Supported types: customer_wise, bill_wise, product_wise'
        })
    }
  } catch (error) {
    console.error('Sales Reports API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate sales report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Customer-wise sales report
async function getCustomerWiseSales(req, res, company_id, from_date, to_date) {
  try {
    // Get sales invoices within the date range
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('sales_invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        customer_id,
        customer:customers(name),
        total_amount,
        tax_amount,
        grand_total
      `)
      .eq('company_id', company_id)
      .gte('invoice_date', from_date)
      .lte('invoice_date', to_date)
      .order('customer_id')

    if (invoicesError) throw invoicesError

    // Group by customer
    const customerSales = {}
    invoices.forEach(invoice => {
      const customerId = invoice.customer_id
      if (!customerSales[customerId]) {
        customerSales[customerId] = {
          customer_id: customerId,
          customer_name: invoice.customer?.name || 'Unknown Customer',
          invoices: [],
          total_amount: 0,
          tax_amount: 0,
          grand_total: 0
        }
      }
      
      customerSales[customerId].invoices.push({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        total_amount: invoice.total_amount,
        tax_amount: invoice.tax_amount,
        grand_total: invoice.grand_total
      })
      
      customerSales[customerId].total_amount += invoice.total_amount || 0
      customerSales[customerId].tax_amount += invoice.tax_amount || 0
      customerSales[customerId].grand_total += invoice.grand_total || 0
    })

    // Convert to array and sort by grand total
    const customerSalesArray = Object.values(customerSales)
    customerSalesArray.sort((a, b) => b.grand_total - a.grand_total)

    return res.status(200).json({
      success: true,
      data: {
        period: {
          from: from_date,
          to: to_date
        },
        report_type: 'customer_wise',
        customers: customerSalesArray,
        summary: {
          total_invoices: invoices.length,
          total_amount: customerSalesArray.reduce((sum, customer) => sum + customer.total_amount, 0),
          total_tax: customerSalesArray.reduce((sum, customer) => sum + customer.tax_amount, 0),
          total_grand: customerSalesArray.reduce((sum, customer) => sum + customer.grand_total, 0)
        }
      }
    })
  } catch (error) {
    throw error
  }
}

// Bill-wise sales report
async function getBillWiseSales(req, res, company_id, from_date, to_date) {
  try {
    // Get sales invoices within the date range
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('sales_invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        customer_id,
        customer:customers(name),
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

// Product-wise sales report
async function getProductWiseSales(req, res, company_id, from_date, to_date) {
  try {
    // Get sales invoice items within the date range
    const { data: invoiceItems, error: itemsError } = await supabaseAdmin
      .from('sales_invoice_items')
      .select(`
        product_id,
        product:products(name),
        quantity,
        unit_price,
        total_amount,
        invoice:sales_invoices(
          invoice_date,
          customer:customers(name)
        )
      `)
      .eq('sales_invoices.company_id', company_id)
      .gte('sales_invoices.invoice_date', from_date)
      .lte('sales_invoices.invoice_date', to_date)

    if (itemsError) throw itemsError

    // Group by product
    const productSales = {}
    invoiceItems.forEach(item => {
      const productId = item.product_id
      if (!productSales[productId]) {
        productSales[productId] = {
          product_id: productId,
          product_name: item.product?.name || 'Unknown Product',
          items: [],
          total_quantity: 0,
          total_amount: 0
        }
      }
      
      productSales[productId].items.push({
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        invoice_date: item.invoice?.invoice_date,
        customer_name: item.invoice?.customer?.name || 'Unknown Customer'
      })
      
      productSales[productId].total_quantity += item.quantity || 0
      productSales[productId].total_amount += item.total_amount || 0
    })

    // Convert to array and sort by total amount
    const productSalesArray = Object.values(productSales)
    productSalesArray.sort((a, b) => b.total_amount - a.total_amount)

    return res.status(200).json({
      success: true,
      data: {
        period: {
          from: from_date,
          to: to_date
        },
        report_type: 'product_wise',
        products: productSalesArray,
        summary: {
          total_products: productSalesArray.length,
          total_quantity: productSalesArray.reduce((sum, product) => sum + product.total_quantity, 0),
          total_amount: productSalesArray.reduce((sum, product) => sum + product.total_amount, 0)
        }
      }
    })
  } catch (error) {
    throw error
  }
}

export default withAuth(handler)