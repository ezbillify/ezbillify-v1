// pages/api/settings/document-numbering.js
import { supabase } from '../../../services/utils/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { company_id } = req.query
      if (!company_id) {
        return res.status(400).json({ success: false, error: 'Company ID required' })
      }

      // Get current financial year
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const financialYear = currentDate.getMonth() >= 3 ? 
        `${currentYear}-${(currentYear + 1).toString().slice(-2)}` :
        `${currentYear - 1}-${currentYear.toString().slice(-2)}`

      const { data, error } = await supabase
        .from('document_sequences')
        .select('*')
        .eq('company_id', company_id)
        .eq('financial_year', financialYear)

      if (error) throw error

      return res.json({ success: true, data: data || [], financial_year: financialYear })
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const { company_id, sequences } = req.body
      if (!company_id || !sequences) {
        return res.status(400).json({ success: false, error: 'Company ID and sequences required' })
      }

      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const financialYear = currentDate.getMonth() >= 3 ?
        `${currentYear}-${(currentYear + 1).toString().slice(-2)}` :
        `${currentYear - 1}-${currentYear.toString().slice(-2)}`

      const sequencesToSave = sequences.map(seq => ({
        company_id,
        document_type: seq.document_type,
        prefix: seq.prefix || '',
        suffix: seq.suffix || '',
        current_number: seq.current_number || 1,
        padding_zeros: seq.padding_zeros || 3,
        reset_yearly: seq.reset_yearly || false,
        financial_year: financialYear,
        sample_format: `${seq.prefix}${(seq.current_number || 1).toString().padStart(seq.padding_zeros || 3, '0')}${seq.suffix}`,
        is_active: true
      }))

      const { data, error } = await supabase
        .from('document_sequences')
        .upsert(sequencesToSave, {
          onConflict: 'company_id,document_type,financial_year'
        })
        .select()

      if (error) throw error

      return res.json({ success: true, data, message: 'Settings saved successfully' })
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}