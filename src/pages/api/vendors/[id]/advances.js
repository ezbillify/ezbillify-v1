// pages/api/vendors/[id]/advances.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id: vendorId } = req.query

  if (method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    const { company_id } = req.query

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      })
    }

    // Verify vendor exists
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('id, vendor_name')
      .eq('id', vendorId)
      .eq('company_id', company_id)
      .single()

    if (vendorError || !vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      })
    }

    // Fetch all advances for this vendor
    const { data: advances, error: advancesError } = await supabaseAdmin
      .from('vendor_advances')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('company_id', company_id)
      .order('created_at', { ascending: false })

    if (advancesError) {
      console.error('Error fetching advances:', advancesError)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch advances'
      })
    }

    return res.status(200).json({
      success: true,
      data: advances || []
    })
  } catch (error) {
    console.error('Vendor advances API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)