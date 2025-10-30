import { supabaseAdmin } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  if (method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Get bank accounts
    const { data: bankAccounts, error: accountsError } = await supabaseAdmin
      .from('bank_accounts')
      .select(`
        id,
        account_name,
        account_number,
        bank_name,
        account_type,
        current_balance,
        opening_balance
      `)
      .eq('company_id', company_id)
      .order('account_name')

    if (accountsError) throw accountsError

    return res.status(200).json({
      success: true,
      data: bankAccounts || []
    })
  } catch (error) {
    console.error('Bank Accounts API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bank accounts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)