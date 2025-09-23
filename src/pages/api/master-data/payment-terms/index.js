import { supabase } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { user, company } = req.auth

  switch (method) {
    case 'GET':
      try {
        const { data, error } = await supabase
          .from('payment_terms')
          .select('*')
          .eq('company_id', company.id)
          .order('term_days')

        if (error) throw error

        res.status(200).json({
          success: true,
          data: data || []
        })
      } catch (error) {
        console.error('Error fetching payment terms:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'POST':
      try {
        const paymentTermData = {
          ...req.body,
          company_id: company.id,
          term_days: parseInt(req.body.term_days) || 0
        }

        const { data, error } = await supabase
          .from('payment_terms')
          .insert([paymentTermData])
          .select()

        if (error) throw error

        res.status(201).json({
          success: true,
          data: data[0]
        })
      } catch (error) {
        console.error('Error creating payment term:', error)
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