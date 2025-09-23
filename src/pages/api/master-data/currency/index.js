import { supabase } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { user, company } = req.auth

  switch (method) {
    case 'GET':
      try {
        const { data, error } = await supabase
          .from('currencies')
          .select('*')
          .eq('company_id', company.id)
          .order('is_base_currency', { ascending: false })
          .order('currency_code')

        if (error) throw error

        res.status(200).json({
          success: true,
          data: data || []
        })
      } catch (error) {
        console.error('Error fetching currencies:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'POST':
      try {
        // If setting as base currency, first remove base from others
        if (req.body.is_base_currency) {
          await supabase
            .from('currencies')
            .update({ is_base_currency: false })
            .eq('company_id', company.id)
        }

        const currencyData = {
          ...req.body,
          company_id: company.id,
          exchange_rate: parseFloat(req.body.exchange_rate) || 1,
          decimal_places: parseInt(req.body.decimal_places) || 2
        }

        // If base currency, set exchange rate to 1
        if (currencyData.is_base_currency) {
          currencyData.exchange_rate = 1
        }

        const { data, error } = await supabase
          .from('currencies')
          .insert([currencyData])
          .select()

        if (error) throw error

        res.status(201).json({
          success: true,
          data: data[0]
        })
      } catch (error) {
        console.error('Error creating currency:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    default:
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}

export default withAuth(handler)