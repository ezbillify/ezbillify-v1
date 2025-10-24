import { supabase, supabaseAdmin } from '../../services/utils/supabase'
import { withAuth } from '../../lib/middleware'

async function handler(req, res) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Test 1: Regular client with RLS
    console.log('Testing regular client with RLS...')
    const { data: regularData, error: regularError, count: regularCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('company_id', company_id)

    console.log('Regular client results:', {
      count: regularCount,
      error: regularError,
      dataLength: regularData?.length
    })

    // Test 2: Admin client bypassing RLS
    console.log('Testing admin client bypassing RLS...')
    const { data: adminData, error: adminError, count: adminCount } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('company_id', company_id)

    console.log('Admin client results:', {
      count: adminCount,
      error: adminError,
      dataLength: adminData?.length
    })

    return res.status(200).json({
      success: true,
      regular: {
        count: regularCount,
        error: regularError?.message,
        dataLength: regularData?.length
      },
      admin: {
        count: adminCount,
        error: adminError?.message,
        dataLength: adminData?.length
      }
    })
  } catch (error) {
    console.error('Test error:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export default withAuth(handler)