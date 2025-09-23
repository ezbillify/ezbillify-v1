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
          .from('tax_rates')
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
        console.error('Error fetching tax rate:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'PUT':
      try {
        // If setting as default, first remove default from other tax rates
        if (req.body.is_default) {
          await supabase
            .from('tax_rates')
            .update({ is_default: false })
            .eq('company_id', company.id)
            .eq('tax_type', req.body.tax_type)
            .neq('id', id)
        }

        const taxRateData = {
          ...req.body,
          tax_rate: parseFloat(req.body.tax_rate) || 0,
          cgst_rate: parseFloat(req.body.cgst_rate) || 0,
          sgst_rate: parseFloat(req.body.sgst_rate) || 0,
          igst_rate: parseFloat(req.body.igst_rate) || 0,
          cess_rate: parseFloat(req.body.cess_rate) || 0
        }

        const { data, error } = await supabase
          .from('tax_rates')
          .update(taxRateData)
          .eq('id', id)
          .eq('company_id', company.id)
          .select()

        if (error) throw error

        res.status(200).json({
          success: true,
          data: data[0]
        })
      } catch (error) {
        console.error('Error updating tax rate:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'DELETE':
      try {
        // Check if tax rate is being used
        const { data: itemUsage } = await supabase
          .from('items')
          .select('id')
          .eq('tax_rate_id', id)
          .limit(1)

        if (itemUsage?.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete tax rate that is assigned to items'
          })
        }

        const { error } = await supabase
          .from('tax_rates')
          .delete()
          .eq('id', id)
          .eq('company_id', company.id)

        if (error) throw error

        res.status(200).json({
          success: true,
          message: 'Tax rate deleted successfully'
        })
      } catch (error) {
        console.error('Error deleting tax rate:', error)
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