// pages/api/sales/invoices/index.js
import { supabase } from '../../../../lib/supabase'
import { withAuth } from '../../../../lib/middleware/auth'
import { generateNextDocumentNumber } from '../../settings/document-numbering'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getInvoices(req, res)
      case 'POST':
        return await createInvoice(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Sales invoices API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getInvoices(req, res) {
  const { 
    company_id, 
    status,
    payment_status,
    customer_id,
    date_from,
    date_to,
    search, 
    page = 1, 
    limit = 50,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Build query
  let query = supabase
    .from('sales_documents')
    .select(`
      *,
      customer:customers(id, name, email, customer_type),
      _items:sales_document_items(count),
      veekaart_order_number
    `, { count: 'exact' })
    .eq('company_id', company_id)
    .eq('document_type', 'invoice')

  // Apply filters
  if (status && ['draft', 'sent', 'confirmed', 'cancelled'].includes(status)) {
    query = query.eq('status', status)
  }

  if (payment_status && ['paid', 'unpaid', 'partial', 'overdue'].includes(payment_status)) {
    query = query.eq('payment_status', payment_status)
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id)
  }

  // Date range filter
  if (date_from) {
    query = query.gte('document_date', date_from)
  }
  if (date_to) {
    query = query.lte('document_date', date_to)
  }

  // Search functionality
  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`
      document_number.ilike.%${searchTerm}%,
      customer_name.ilike.%${searchTerm}%,
      reference_number.ilike.%${searchTerm}%,
      veekaart_order_number.ilike.%${searchTerm}%
    `)
  }

  // Sorting
  const allowedSortFields = ['document_number', 'document_date', 'customer_name', 'total_amount', 'status', 'created_at']
  const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at'
  const sortDirection = sort_order === 'asc' ? true : false
  
  query = query.order(sortField, { ascending: sortDirection })

  // Pagination
  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  query = query.range(offset, offset + limitNum - 1)

  const { data: invoices, error, count } = await query

  if (error) {
    console.error('Error fetching invoices:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices'
    })
  }

  // Calculate summary statistics
  const stats = await getInvoiceStatistics(company_id)

  // Pagination info
  const totalPages = Math.ceil(count / limitNum)

  return res.status(200).json({
    success: true,
    data: invoices,
    statistics: stats,
    pagination: {
      current_page: pageNum,
      total_pages: totalPages,
      total_records: count,
      per_page: limitNum,
      has_next_page: pageNum < totalPages,
      has_prev_page: pageNum > 1
    }
  })
}

async function createInvoice(req, res) {
  const {
    company_id,
    customer_id,
    document_date,
    due_date,
    reference_number,
    billing_address,
    shipping_address,
    items,
    discount_percentage = 0,
    discount_amount = 0,
    notes,
    terms_conditions,
    veekaart_order_id,
    veekaart_order_number,
    currency = 'INR',
    exchange_rate = 1
  } = req.body

  if (!company_id || !customer_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, customer ID, and items are required'
    })
  }

  // Validate customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customer_id)
    .eq('company_id', company_id)
    .single()

  if (customerError || !customer) {
    return res.status(404).json({
      success: false,
      error: 'Customer not found'
    })
  }

  // Validate and calculate items
  const validatedItems = []
  let subtotal = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    
    if (!item.item_id || !item.quantity || !item.rate) {
      return res.status(400).json({
        success: false,
        error: `Invalid item data at position ${i + 1}`
      })
    }

    // Get item details
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select(`
        *,
        primary_unit:units!items_primary_unit_id_fkey(unit_name, unit_symbol),
        tax_rate:tax_rates(id, tax_rate, cgst_rate, sgst_rate, igst_rate)
      `)
      .eq('id', item.item_id)
      .eq('company_id', company_id)
      .single()

    if (itemError || !itemData) {
      return res.status(404).json({
        success: false,
        error: `Item not found at position ${i + 1}`
      })
    }

    const quantity = parseFloat(item.quantity)
    const rate = parseFloat(item.rate)
    const lineDiscount = parseFloat(item.discount_amount) || 0
    
    // Calculate taxable amount
    const lineTotal = quantity * rate
    const taxableAmount = lineTotal - lineDiscount

    // Calculate tax amounts based on customer and company location
    const taxRates = itemData.tax_rate || {}
    const isInterState = customer.billing_address?.state !== billing_address?.state
    
    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0
    
    if (taxRates && itemData.tax_preference === 'taxable') {
      if (isInterState) {
        igstAmount = (taxableAmount * (taxRates.igst_rate || 0)) / 100
      } else {
        cgstAmount = (taxableAmount * (taxRates.cgst_rate || 0)) / 100
        sgstAmount = (taxableAmount * (taxRates.sgst_rate || 0)) / 100
      }
    }

    const totalItemAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount

    const validatedItem = {
      item_id: itemData.id,
      item_code: itemData.item_code,
      item_name: itemData.item_name,
      description: item.description || itemData.description,
      quantity,
      unit_id: itemData.primary_unit_id,
      unit_name: itemData.primary_unit?.unit_name || 'PCS',
      rate,
      discount_percentage: parseFloat(item.discount_percentage) || 0,
      discount_amount: lineDiscount,
      taxable_amount: taxableAmount,
      tax_rate: taxRates.tax_rate || 0,
      cgst_rate: taxRates.cgst_rate || 0,
      sgst_rate: taxRates.sgst_rate || 0,
      igst_rate: taxRates.igst_rate || 0,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      total_amount: totalItemAmount,
      hsn_sac_code: itemData.hsn_sac_code
    }

    validatedItems.push(validatedItem)
    subtotal += lineTotal
  }

  // Calculate document totals
  const documentDiscountAmount = parseFloat(discount_amount) || 
    (parseFloat(discount_percentage) * subtotal / 100) || 0
  
  const adjustedSubtotal = subtotal - documentDiscountAmount
  const totalTaxAmount = validatedItems.reduce((sum, item) => 
    sum + item.cgst_amount + item.sgst_amount + item.igst_amount, 0)
  const totalAmount = adjustedSubtotal + totalTaxAmount

  // Generate invoice number
  const { document_number } = await generateNextDocumentNumber(company_id, 'invoice')

  // Create invoice
  const invoiceData = {
    company_id,
    document_type: 'invoice',
    document_number,
    reference_number: reference_number?.trim(),
    document_date: document_date || new Date().toISOString().split('T')[0],
    due_date: due_date || null,
    customer_id,
    customer_name: customer.name,
    customer_gstin: customer.gstin,
    billing_address: billing_address || customer.billing_address,
    shipping_address: shipping_address || customer.shipping_address,
    subtotal,
    discount_percentage: parseFloat(discount_percentage) || 0,
    discount_amount: documentDiscountAmount,
    tax_amount: totalTaxAmount,
    cgst_amount: validatedItems.reduce((sum, item) => sum + item.cgst_amount, 0),
    sgst_amount: validatedItems.reduce((sum, item) => sum + item.sgst_amount, 0),
    igst_amount: validatedItems.reduce((sum, item) => sum + item.igst_amount, 0),
    total_amount: totalAmount,
    balance_amount: totalAmount,
    status: 'confirmed',
    payment_status: 'unpaid',
    notes: notes?.trim(),
    terms_conditions: terms_conditions?.trim(),
    currency,
    exchange_rate: parseFloat(exchange_rate),
    veekaart_order_id,
    veekaart_order_number: veekaart_order_number?.trim(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('sales_documents')
    .insert(invoiceData)
    .select()
    .single()

  if (invoiceError) {
    console.error('Error creating invoice:', invoiceError)
    return res.status(500).json({
      success: false,
      error: 'Failed to create invoice'
    })
  }

  // Create invoice items and update inventory
  const createdItems = []
  for (const item of validatedItems) {
    // Create invoice item
    const { data: invoiceItem, error: itemError } = await supabase
      .from('sales_document_items')
      .insert({
        document_id: invoice.id,
        ...item,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (itemError) {
      console.error('Error creating invoice item:', itemError)
      // Could implement rollback here
      continue
    }

    createdItems.push(invoiceItem)

    // Update inventory if item tracks inventory
    const { data: itemInfo } = await supabase
      .from('items')
      .select('track_inventory, current_stock')
      .eq('id', item.item_id)
      .single()

    if (itemInfo?.track_inventory) {
      // Create inventory movement (stock out)
      await supabase
        .from('inventory_movements')
        .insert({
          company_id,
          item_id: item.item_id,
          item_code: item.item_code,
          movement_type: 'out',
          quantity: item.quantity,
          rate: item.rate,
          value: item.quantity * item.rate,
          reference_type: 'sales_document',
          reference_id: invoice.id,
          reference_number: document_number,
          stock_before: itemInfo.current_stock,
          stock_after: itemInfo.current_stock - item.quantity,
          movement_date: invoiceData.document_date,
          notes: `Sales invoice: ${document_number}`,
          created_at: new Date().toISOString()
        })

      // Update item stock
      await supabase
        .from('items')
        .update({
          current_stock: Math.max(0, itemInfo.current_stock - item.quantity),
          available_stock: Math.max(0, itemInfo.current_stock - item.quantity),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.item_id)

      // Update VeeKaart stock if integrated
      if (itemInfo.veekaart_product_id) {
        await notifyVeeKaartStockUpdate(company_id, itemInfo.veekaart_product_id, 
          Math.max(0, itemInfo.current_stock - item.quantity))
      }
    }
  }

  return res.status(201).json({
    success: true,
    message: `Invoice ${document_number} created successfully`,
    data: {
      ...invoice,
      items: createdItems,
      customer: {
        id: customer.id,
        name: customer.name,
        customer_type: customer.customer_type
      }
    }
  })
}

async function getInvoiceStatistics(company_id) {
  try {
    const { data: stats } = await supabase
      .from('sales_documents')
      .select('status, payment_status, total_amount, paid_amount')
      .eq('company_id', company_id)
      .eq('document_type', 'invoice')

    if (!stats) return null

    const totalInvoices = stats.length
    const totalAmount = stats.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0)
    const totalPaid = stats.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0)
    const totalOutstanding = totalAmount - totalPaid

    return {
      total_invoices: totalInvoices,
      total_amount: totalAmount,
      total_paid: totalPaid,
      total_outstanding: totalOutstanding,
      draft_invoices: stats.filter(s => s.status === 'draft').length,
      confirmed_invoices: stats.filter(s => s.status === 'confirmed').length,
      paid_invoices: stats.filter(s => s.payment_status === 'paid').length,
      unpaid_invoices: stats.filter(s => s.payment_status === 'unpaid').length
    }
  } catch (error) {
    console.error('Error calculating invoice statistics:', error)
    return null
  }
}

async function notifyVeeKaartStockUpdate(company_id, veekaart_product_id, new_stock) {
  try {
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', company_id)
      .eq('integration_type', 'veekaart')
      .eq('is_active', true)
      .single()

    if (!integration) return

    const apiConfig = integration.api_config || {}
    await fetch(`${apiConfig.api_url}/api/products/stock`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiConfig.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: veekaart_product_id,
        stock_quantity: new_stock,
        updated_by: 'ezbillify_invoice'
      })
    })
  } catch (error) {
    console.error('Error notifying VeeKaart of stock update:', error)
  }
}

export default withAuth(handler)