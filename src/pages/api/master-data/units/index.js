import { supabase } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { user, company } = req.auth

  switch (method) {
    case 'GET':
      try {
        const { data, error } = await supabase
          .from('units')
          .select(`
            *,
            base_unit:base_unit_id(unit_name, unit_symbol)
          `)
          .or(`company_id.eq.${company.id},company_id.is.null`)
          .order('unit_type')
          .order('unit_name')

        if (error) throw error

        res.status(200).json({
          success: true,
          data: data || []
        })
      } catch (error) {
        console.error('Error fetching units:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'POST':
      try {
        const unitData = {
          ...req.body,
          company_id: company.id,
          conversion_factor: parseFloat(req.body.conversion_factor) || 1,
          base_unit_id: req.body.base_unit_id || null
        }

        const { data, error } = await supabase
          .from('units')
          .insert([unitData])
          .select()

        if (error) throw error

        res.status(201).json({
          success: true,
          data: data[0]
        })
      } catch (error) {
        console.error('Error creating unit:', error)
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