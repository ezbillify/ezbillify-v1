// pages/api/vendors/[id].js
import { supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Vendor ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getVendor(req, res, id)
      case 'PUT':
        return await updateVendor(req, res, id)
      case 'DELETE':
        return await deleteVendor(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Vendor API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getVendor(req, res, vendorId) {
  const { company_id, include_transactions = false, include_deleted = false } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Base vendor query
  let query = supabaseAdmin
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .eq('company_id', company_id)

  // Exclude deleted vendors unless specifically requested
  if (include_deleted !== 'true') {
    query = query.is('deleted_at', null)
  }

  const { data: vendor, error } = await query.single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      })
    }
    
    console.error('Error fetching vendor:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch vendor'
    })
  }

  let vendorData = vendor

  // Include transaction summary if requested
  if (include_transactions === 'true') {
    const stats = await getVendorStatistics(vendorId)
    
    vendorData = {
      ...vendor,
      statistics: stats
    }
  }

  return res.status(200).json({
    success: true,
    data: vendorData
  })
}

async function updateVendor(req, res, vendorId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if vendor exists and is not deleted
  const { data: existingVendor, error: fetchError } = await supabaseAdmin
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .eq('company_id', company_id)
    .is('deleted_at', null)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch vendor'
    })
  }

  // Validate vendor type if provided
  if (req.body.vendor_type && !['b2b', 'b2c', 'both'].includes(req.body.vendor_type)) {
    return res.status(400).json({
      success: false,
      error: 'Vendor type must be b2b, b2c, or both'
    })
  }

  // Check for duplicate vendor code (excluding current vendor and deleted vendors)
  if (req.body.vendor_code) {
    const { data: duplicate } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('company_id', company_id)
      .eq('vendor_code', req.body.vendor_code.trim())
      .neq('id', vendorId)
      .is('deleted_at', null)
      .single()

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: 'Another vendor with this code already exists'
      })
    }
  }

  // Check for duplicate GSTIN (excluding current vendor and deleted vendors)
  if (req.body.gstin && req.body.gstin.trim()) {
    const { data: duplicate } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('company_id', company_id)
      .eq('gstin', req.body.gstin.trim().toUpperCase())
      .neq('id', vendorId)
      .is('deleted_at', null)
      .single()

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: 'Another vendor with this GSTIN already exists'
      })
    }
  }

  // Prepare update data
  const allowedFields = [
    'vendor_code', 'vendor_name', 'display_name', 'vendor_type',
    'email', 'phone', 'alternate_phone', 'website',
    'gstin', 'pan', 'billing_address', 'shipping_address', 
    'same_as_billing', 'bank_details', 'payment_terms',
    'credit_limit', 'notes', 'status', 'is_active'
  ]

  const updateData = {}
  
  allowedFields.forEach(field => {
    if (req.body.hasOwnProperty(field)) {
      let value = req.body[field]
      
      // Type-specific processing
      if (['vendor_name', 'display_name', 'notes'].includes(field) && value) {
        value = value.trim()
      } else if (['email'].includes(field) && value) {
        value = value.trim().toLowerCase()
      } else if (['gstin', 'pan'].includes(field) && value) {
        value = value.trim().toUpperCase()
      } else if (['credit_limit'].includes(field)) {
        value = value ? parseFloat(value) : null
      }
      
      updateData[field] = value
    }
  })

  // Handle same_as_billing - copy billing to shipping if true
  if (req.body.hasOwnProperty('same_as_billing')) {
    updateData.same_as_billing = req.body.same_as_billing === true || req.body.same_as_billing === 'true'
    
    if (updateData.same_as_billing) {
      updateData.shipping_address = req.body.billing_address || existingVendor.billing_address
    }
  }

  // Add timestamp
  updateData.updated_at = new Date().toISOString()

  const { data: updatedVendor, error: updateError } = await supabaseAdmin
    .from('vendors')
    .update(updateData)
    .eq('id', vendorId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating vendor:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update vendor'
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Vendor updated successfully',
    data: updatedVendor
  })
}

async function deleteVendor(req, res, vendorId) {
  const { company_id, force = false, permanent = false } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if vendor exists
  const { data: vendor, error: fetchError } = await supabaseAdmin
    .from('vendors')
    .select('id, vendor_name, vendor_code, deleted_at')
    .eq('id', vendorId)
    .eq('company_id', company_id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      })
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch vendor'
    })
  }

  // Check if already deleted
  if (vendor.deleted_at && !permanent) {
    return res.status(400).json({
      success: false,
      error: 'Vendor is already deleted',
      already_deleted: true
    })
  }

  // Check if vendor has related transactions (unless forced or permanent delete)
  if (!force && !permanent) {
    const [bills, payments] = await Promise.all([
      supabaseAdmin
        .from('purchase_documents')
        .select('id')
        .eq('vendor_id', vendorId)
        .limit(1),
      supabaseAdmin
        .from('payments_made')
        .select('id')
        .eq('vendor_id', vendorId)
        .limit(1)
    ])

    if ((bills.data && bills.data.length > 0) || 
        (payments.data && payments.data.length > 0)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete vendor with existing transactions. The vendor will be marked as inactive instead.',
        has_transactions: true
      })
    }
  }

  // Permanent delete (only for admin/force operations - use with caution)
  if (permanent) {
    const { error: deleteError } = await supabaseAdmin
      .from('vendors')
      .delete()
      .eq('id', vendorId)
      .eq('company_id', company_id)

    if (deleteError) {
      console.error('Error permanently deleting vendor:', deleteError)
      return res.status(500).json({
        success: false,
        error: 'Failed to permanently delete vendor',
        details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
      })
    }

    return res.status(200).json({
      success: true,
      message: `Vendor "${vendor.vendor_name}" (${vendor.vendor_code}) permanently deleted`,
      permanent: true
    })
  }

  // Soft delete (default behavior)
  const { error: deleteError } = await supabaseAdmin
    .from('vendors')
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', vendorId)
    .eq('company_id', company_id)

  if (deleteError) {
    console.error('Error deleting vendor:', deleteError)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete vendor',
      details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
    })
  }

  return res.status(200).json({
    success: true,
    message: `Vendor "${vendor.vendor_name}" (${vendor.vendor_code}) deleted successfully`
  })
}

async function getVendorStatistics(vendorId) {
  try {
    // Get purchase statistics
    const { data: purchaseData } = await supabaseAdmin
      .from('purchase_documents')
      .select('document_type, total_amount, balance_due, status')
      .eq('vendor_id', vendorId)

    if (!purchaseData) return null

    const stats = {
      total_purchases: purchaseData.filter(d => d.document_type === 'bill').length,
      total_purchase_value: purchaseData
        .filter(d => d.document_type === 'bill')
        .reduce((sum, d) => sum + (parseFloat(d.total_amount) || 0), 0),
      total_outstanding: purchaseData
        .filter(d => d.status !== 'paid' && d.status !== 'cancelled')
        .reduce((sum, d) => sum + (parseFloat(d.balance_due) || 0), 0)
    }

    // Get payment statistics
    const { data: paymentData } = await supabaseAdmin
      .from('payments_made')
      .select('amount')
      .eq('vendor_id', vendorId)

    if (paymentData) {
      stats.total_payments = paymentData.length
      stats.total_paid = paymentData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    }

    return stats
  } catch (error) {
    console.error('Error fetching vendor statistics:', error)
    return null
  }
}

export default withAuth(handler)