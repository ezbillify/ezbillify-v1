import { supabase } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { user, company } = req.auth

  switch (method) {
    case 'GET':
      try {
        const { data, error } = await supabase
          .from('tax_rates')
          .select('*')
          .eq('company_id', company.id)
          .order('tax_type', { ascending: true })
          .order('tax_rate', { ascending: true })

        if (error) throw error

        res.status(200).json({
          success: true,
          data: data || []
        })
      } catch (error) {
        console.error('Error fetching tax rates:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'POST':
      try {
        // If setting as default, first remove default from other tax rates
        if (req.body.is_default) {
          await supabase
            .from('tax_rates')
            .update({ is_default: false })
            .eq('company_id', company.id)
            .eq('tax_type', req.body.tax_type)
        }

        const taxRateData = {
          ...req.body,
          company_id: company.id,
          tax_rate: parseFloat(req.body.tax_rate) || 0,
          cgst_rate: parseFloat(req.body.cgst_rate) || 0,
          sgst_rate: parseFloat(req.body.sgst_rate) || 0,
          igst_rate: parseFloat(req.body.igst_rate) || 0,
          cess_rate: parseFloat(req.body.cess_rate) || 0
        }

        const { data, error } = await supabase
          .from('tax_rates')
          .insert([taxRateData])
          .select()

        if (error) throw error

        res.status(201).json({
          success: true,
          data: data[0]
        })
      } catch (error) {
        console.error('Error creating tax rate:', error)
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