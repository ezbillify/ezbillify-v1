import { supabase } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query
  const { user, company } = req.auth

  switch (method) {
    case 'GET':
      try {
        const { data, error } = await supabase
          .from('currencies')
          .select('*')
          .eq('id', id)
          .eq('company_id', company.id)
          .single()

        if (error) throw error

        res.status(200).json({
          success: true,
          data
        })
      } catch (error) {
        console.error('Error fetching currency:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'PUT':
      try {
        // If setting as base currency, first remove base from others
        if (req.body.is_base_currency) {
          await supabase
            .from('currencies')
            .update({ is_base_currency: false })
            .eq('company_id', company.id)
            .neq('id', id)
        }

        const currencyData = {
          ...req.body,
          exchange_rate: parseFloat(req.body.exchange_rate) || 1,
          decimal_places: parseInt(req.body.decimal_places) || 2
        }

        // If base currency, set exchange rate to 1
        if (currencyData.is_base_currency) {
          currencyData.exchange_rate = 1
        }

        const { data, error } = await supabase
          .from('currencies')
          .update(currencyData)
          .eq('id', id)
          .eq('company_id', company.id)
          .select()

        if (error) throw error

        res.status(200).json({
          success: true,
          data: data[0]
        })
      } catch (error) {
        console.error('Error updating currency:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'DELETE':
      try {
        // Check if currency is being used in transactions
        const { data: salesUsage } = await supabase
          .from('sales_documents')
          .select('id')
          .eq('currency', req.body.currency_code || id)
          .limit(1)

        if (salesUsage?.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete currency that is used in transactions'
          })
        }

        // Check if it's a base currency
        const { data: existingCurrency } = await supabase
          .from('currencies')
          .select('is_base_currency')
          .eq('id', id)
          .eq('company_id', company.id)
          .single()

        if (existingCurrency?.is_base_currency) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete base currency'
          })
        }

        const { error } = await supabase
          .from('currencies')
          .delete()
          .eq('id', id)
          .eq('company_id', company.id)

        if (error) throw error

        res.status(200).json({
          success: true,
          message: 'Currency deleted successfully'
        })
      } catch (error) {
        console.error('Error deleting currency:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}

export default withAuth(handler)