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
          .from('payment_terms')
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
        console.error('Error fetching payment term:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'PUT':
      try {
        const paymentTermData = {
          ...req.body,
          term_days: parseInt(req.body.term_days) || 0
        }

        const { data, error } = await supabase
          .from('payment_terms')
          .update(paymentTermData)
          .eq('id', id)
          .eq('company_id', company.id)
          .select()

        if (error) throw error

        res.status(200).json({
          success: true,
          data: data[0]
        })
      } catch (error) {
        console.error('Error updating payment term:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'DELETE':
      try {
        // Check if payment term is being used by customers
        const { data: customerUsage } = await supabase
          .from('customers')
          .select('id')
          .eq('payment_terms', id)
          .limit(1)

        if (customerUsage?.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete payment term that is assigned to customers'
          })
        }

        // Check if payment term is being used by vendors
        const { data: vendorUsage } = await supabase
          .from('vendors')
          .select('id')
          .eq('payment_terms', id)
          .limit(1)

        if (vendorUsage?.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete payment term that is assigned to vendors'
          })
        }

        const { error } = await supabase
          .from('payment_terms')
          .delete()
          .eq('id', id)
          .eq('company_id', company.id)

        if (error) throw error

        res.status(200).json({
          success: true,
          message: 'Payment term deleted successfully'
        })
      } catch (error) {
        console.error('Error deleting payment term:', error)
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