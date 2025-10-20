// pages/api/branches/[id].js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    const { method, query } = req
    const { id } = query
    const authHeader = req.headers.authorization
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token' })
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' })
    }

    // Get company_id from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.company_id) {
      console.error('User data error:', userError)
      return res.status(400).json({ error: 'Company ID not found in user profile' })
    }

    const companyId = userData.company_id

    if (method === 'GET') {
      // Get single branch
      const { data: branch, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

      if (error) {
        console.error('Supabase error:', error)
        return res.status(404).json({ error: 'Branch not found' })
      }

      return res.status(200).json(branch)
    }

    if (method === 'PUT') {
      // Update branch
      const { name, address, billing_address, phone, email, is_active } = req.body

      // Check if it's the default branch
      const { data: branch } = await supabase
        .from('branches')
        .select('is_default')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

      if (branch?.is_default && is_active === false) {
        return res.status(400).json({ error: 'Cannot deactivate default branch' })
      }

      const { data: updatedBranch, error } = await supabase
        .from('branches')
        .update({
          name,
          address: address || {},
          billing_address: billing_address || {},
          phone: phone || '',
          email: email || '',
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()

      if (error) {
        console.error('Supabase error:', error)
        return res.status(500).json({ error: 'Failed to update branch' })
      }

      return res.status(200).json(updatedBranch?.[0])
    }

    if (method === 'DELETE') {
      // Check if it's the default branch
      const { data: branch } = await supabase
        .from('branches')
        .select('is_default')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

      if (branch?.is_default) {
        return res.status(400).json({ error: 'Cannot delete default branch' })
      }

      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)

      if (error) {
        console.error('Supabase error:', error)
        return res.status(500).json({ error: 'Failed to delete branch' })
      }

      return res.status(200).json({ message: 'Branch deleted successfully' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}