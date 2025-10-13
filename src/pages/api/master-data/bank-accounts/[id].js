import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query
  const { user, company } = req.auth

  switch (method) {
    case 'GET':
      try {
        // ✅ FIXED: Use supabaseAdmin to bypass RLS
        const { data, error } = await supabaseAdmin
          .from('bank_accounts')
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
        console.error('Error fetching bank account:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'PUT':
      try {
        // If setting as default, first remove default from other bank accounts
        if (req.body.is_default) {
          await supabaseAdmin
            .from('bank_accounts')
            .update({ is_default: false })
            .eq('company_id', company.id)
            .neq('id', id)
        }

        const bankAccountData = {
          ...req.body,
          opening_balance: parseFloat(req.body.opening_balance) || 0
        }

        // ✅ FIXED: Use supabaseAdmin to bypass RLS
        const { data, error } = await supabaseAdmin
          .from('bank_accounts')
          .update(bankAccountData)
          .eq('id', id)
          .eq('company_id', company.id)
          .select()

        if (error) throw error

        res.status(200).json({
          success: true,
          data: data[0]
        })
      } catch (error) {
        console.error('Error updating bank account:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'DELETE':
      try {
        // Check if bank account is being used in payments
        const { data: paymentUsage } = await supabaseAdmin
          .from('payments')
          .select('id')
          .eq('bank_account_id', id)
          .limit(1)

        if (paymentUsage?.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Cannot delete bank account that has payment transactions'
          })
        }

        // ✅ FIXED: Use supabaseAdmin to bypass RLS
        const { error } = await supabaseAdmin
          .from('bank_accounts')
          .delete()
          .eq('id', id)
          .eq('company_id', company.id)

        if (error) throw error

        res.status(200).json({
          success: true,
          message: 'Bank account deleted successfully'
        })
      } catch (error) {
        console.error('Error deleting bank account:', error)
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