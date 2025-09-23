import { supabase } from '../../../services/utils/supabase'
import { withAuth } from '../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { user, company } = req.auth

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${method} Not Allowed`)
  }

  try {
    const [
      accountsResult,
      taxRatesResult,
      unitsResult,
      bankAccountsResult,
      currenciesResult,
      paymentTermsResult
    ] = await Promise.all([
      supabase.from('chart_of_accounts').select('id, is_active').eq('company_id', company.id),
      supabase.from('tax_rates').select('id, is_active').eq('company_id', company.id),
      supabase.from('units').select('id, is_active').or(`company_id.eq.${company.id},company_id.is.null`),
      supabase.from('bank_accounts').select('id, is_active').eq('company_id', company.id),
      supabase.from('currencies').select('id, is_active').eq('company_id', company.id),
      supabase.from('payment_terms').select('id, is_active').eq('company_id', company.id)
    ])

    const stats = {
      accounts: {
        total: accountsResult.data?.length || 0,
        active: accountsResult.data?.filter(item => item.is_active).length || 0
      },
      taxRates: {
        total: taxRatesResult.data?.length || 0,
        active: taxRatesResult.data?.filter(item => item.is_active).length || 0
      },
      units: {
        total: unitsResult.data?.length || 0,
        active: unitsResult.data?.filter(item => item.is_active).length || 0
      },
      bankAccounts: {
        total: bankAccountsResult.data?.length || 0,
        active: bankAccountsResult.data?.filter(item => item.is_active).length || 0
      },
      currencies: {
        total: currenciesResult.data?.length || 0,
        active: currenciesResult.data?.filter(item => item.is_active).length || 0
      },
      paymentTerms: {
        total: paymentTermsResult.data?.length || 0,
        active: paymentTermsResult.data?.filter(item => item.is_active).length || 0
      }
    }

    res.status(200).json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Error fetching master data stats:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export default withAuth(handler)