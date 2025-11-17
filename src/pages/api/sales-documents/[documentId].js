// src/pages/api/sales-documents/[documentId].js
import { supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { documentId } = req.query

  if (!documentId) {
    return res.status(400).json({
      success: false,
      error: 'Document ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getSalesDocument(req, res, documentId)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Sales document API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getSalesDocument(req, res, documentId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Get sales document with company, branch, customer, and items
    const { data: document, error } = await supabaseAdmin
      .from('sales_documents')
      .select(`
        *,
        company:companies(
          id,
          name,
          gstin,
          pan,
          phone,
          email,
          website,
          address,
          billing_address,
          shipping_address,
          logo_url,
          logo_thermal_url
        ),
        branch:branches(
          id,
          name,
          document_prefix,
          phone,
          email,
          address,
          billing_address
        ),
        customer:customers(
          id,
          name,
          company_name,
          customer_code,
          customer_type,
          email,
          phone,
          mobile,
          gstin,
          billing_address,
          shipping_address,
          credit_limit,
          credit_used,
          discount_percentage
        ),
        items:sales_document_items(
          *,
          item:items(
            id,
            item_code,
            item_name,
            print_name,
            description,
            category,
            brand,
            selling_price,
            purchase_price,
            mrp,
            hsn_sac_code,
            tax_rate_id,
            tax_preference,
            current_stock,
            reserved_stock,
            available_stock,
            barcodes,
            images,
            specifications
          ),
          unit:units(
            id,
            unit_name,
            unit_symbol
          )
        ),
        bank_account:bank_accounts(
          id,
          bank_name,
          account_number,
          ifsc_code,
          upi_id,
          branch_name
        )
      `)
      .eq('id', documentId)
      .eq('company_id', company_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Sales document not found'
        })
      }
      
      console.error('Error fetching sales document:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sales document'
      })
    }

    return res.status(200).json({
      success: true,
      data: document
    })
  } catch (error) {
    console.error('Error in getSalesDocument:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)