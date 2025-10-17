// pages/api/vendors/[id]/reset-advance.js
// SIMPLEST VERSION - FOR TESTING (Add auth later)

import { supabaseAdmin } from '../../../../services/utils/supabase'

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { id: vendorId } = req.query
  const { company_id } = req.body

  console.log('🔄 Reset Advance Request:', { vendorId, company_id })

  if (!company_id || !vendorId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields' 
    })
  }

  try {
    // Simple update - just set advance_amount to 0
    const { data, error } = await supabaseAdmin
      .from('vendors')
      .update({ advance_amount: 0 })
      .eq('id', vendorId)
      .eq('company_id', company_id)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase Error:', error)
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      })
    }

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Vendor not found' 
      })
    }

    console.log('✅ Success! Advance reset for:', data.vendor_name)

    return res.status(200).json({ 
      success: true, 
      message: 'Advance reset successfully',
      data 
    })

  } catch (error) {
    console.error('❌ Catch Error:', error)
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
}