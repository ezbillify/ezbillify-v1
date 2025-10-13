import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { user, company } = req.auth

  switch (method) {
    case 'GET':
      try {
        // ✅ FIXED: Use supabaseAdmin to bypass RLS
        const { data, error } = await supabaseAdmin
          .from('bank_accounts')
          .select('*')
          .eq('company_id', company.id)
          .order('is_default', { ascending: false })
          .order('account_name')

        if (error) throw error

        res.status(200).json({
          success: true,
          data: data || []
        })
      } catch (error) {
        console.error('Error fetching bank accounts:', error)
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
      break

    case 'POST':
      try {
        // If setting as default, first remove default from other bank accounts
        if (req.body.is_default) {
          await supabaseAdmin
            .from('bank_accounts')
            .update({ is_default: false })
            .eq('company_id', company.id)
        }

        const bankAccountData = {
          ...req.body,
          company_id: company.id,
          opening_balance: parseFloat(req.body.opening_balance) || 0,
          current_balance: parseFloat(req.body.opening_balance) || 0
        }

        // ✅ FIXED: Use supabaseAdmin to bypass RLS
        const { data, error } = await supabaseAdmin
          .from('bank_accounts')
          .insert([bankAccountData])
          .select()

        if (error) throw error

        res.status(201).json({
          success: true,
          data: data[0]
        })
      } catch (error) {
        console.error('Error creating bank account:', error)
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