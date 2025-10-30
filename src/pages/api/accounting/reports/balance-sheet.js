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

  const { company_id, as_of_date } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Get all accounts with their current balances
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('chart_of_accounts')
      .select(`
        id,
        account_code,
        account_name,
        account_type,
        account_subtype,
        current_balance
      `)
      .eq('company_id', company_id)
      .order('account_code')

    if (accountsError) throw accountsError

    // Categorize accounts
    const assets = accounts.filter(acc => acc.account_type === 'asset')
    const liabilities = accounts.filter(acc => acc.account_type === 'liability')
    const equity = accounts.filter(acc => acc.account_type === 'equity')

    // Group assets by subtype
    const currentAssets = assets.filter(acc => acc.account_subtype === 'current_asset')
    const fixedAssets = assets.filter(acc => acc.account_subtype === 'fixed_asset')
    const otherAssets = assets.filter(acc => !['current_asset', 'fixed_asset'].includes(acc.account_subtype))

    // Group liabilities by subtype
    const currentLiabilities = liabilities.filter(acc => acc.account_subtype === 'current_liability')
    const longTermLiabilities = liabilities.filter(acc => acc.account_subtype === 'long_term_liability')
    const otherLiabilities = liabilities.filter(acc => !['current_liability', 'long_term_liability'].includes(acc.account_subtype))

    // Calculate totals
    const totalAssets = assets.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)
    const totalEquity = equity.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)

    // Calculate totals by subtype
    const totalCurrentAssets = currentAssets.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)
    const totalFixedAssets = fixedAssets.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)
    const totalOtherAssets = otherAssets.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)

    const totalCurrentLiabilities = currentLiabilities.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)
    const totalLongTermLiabilities = longTermLiabilities.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)
    const totalOtherLiabilities = otherLiabilities.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)

    return res.status(200).json({
      success: true,
      data: {
        asOfDate: as_of_date || new Date().toISOString().split('T')[0],
        assets: {
          current: currentAssets,
          fixed: fixedAssets,
          other: otherAssets,
          totals: {
            current: totalCurrentAssets,
            fixed: totalFixedAssets,
            other: totalOtherAssets,
            total: totalAssets
          }
        },
        liabilities: {
          current: currentLiabilities,
          longTerm: longTermLiabilities,
          other: otherLiabilities,
          totals: {
            current: totalCurrentLiabilities,
            longTerm: totalLongTermLiabilities,
            other: totalOtherLiabilities,
            total: totalLiabilities
          }
        },
        equity: {
          items: equity,
          total: totalEquity
        },
        totals: {
          assets: totalAssets,
          liabilities: totalLiabilities,
          equity: totalEquity,
          liabilitiesAndEquity: totalLiabilities + totalEquity
        },
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
      }
    })
  } catch (error) {
    console.error('Balance Sheet API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate balance sheet',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)