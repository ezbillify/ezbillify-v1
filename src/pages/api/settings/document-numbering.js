// pages/api/settings/document-numbering.js
import { supabase } from '../../../services/utils/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
}

async function handleGet(req, res) {
  try {
    const { company_id } = req.query

    if (!company_id) {
      return res.status(400).json({ success: false, error: 'Company ID is required' })
    }

    // Get current financial year
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const financialYear = currentDate.getMonth() >= 3 ? // April onwards
      `${currentYear}-${(currentYear + 1).toString().slice(-2)}` :
      `${currentYear - 1}-${currentYear.toString().slice(-2)}`

    const { data, error } = await supabase
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('financial_year', financialYear)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch document sequences' })
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      financial_year: financialYear
    })

  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

async function handlePost(req, res) {
  try {
    const { company_id, sequences } = req.body

    if (!company_id || !sequences) {
      return res.status(400).json({ success: false, error: 'Company ID and sequences are required' })
    }

    // Get current financial year
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const financialYear = currentDate.getMonth() >= 3 ?
      `${currentYear}-${(currentYear + 1).toString().slice(-2)}` :
      `${currentYear - 1}-${currentYear.toString().slice(-2)}`

    // Prepare sequences for upsert
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

    // Use upsert to handle both insert and update
    const { data, error } = await supabase
      .from('document_sequences')
      .upsert(sequencesToSave, {
        onConflict: 'company_id,document_type,financial_year'
      })
      .select()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ success: false, error: 'Failed to save document sequences' })
    }

    return res.status(200).json({
      success: true,
      data: data,
      message: 'Document numbering settings saved successfully'
    })

  } catch (error) {
    console.error('API error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// Helper function to get next document number (used by other APIs)
export async function getNextDocumentNumber(companyId, documentType) {
  try {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const financialYear = currentDate.getMonth() >= 3 ?
      `${currentYear}-${(currentYear + 1).toString().slice(-2)}` :
      `${currentYear - 1}-${currentYear.toString().slice(-2)}`

    // Get current sequence
    let { data: sequence, error } = await supabase
      .from('document_sequences')
      .select('*')
      .eq('company_id', companyId)
      .eq('document_type', documentType)
      .eq('financial_year', financialYear)
      .single()

    if (error && error.code === 'PGRST116') {
      // No sequence exists, create default one
      const defaultPrefixes = {
        'invoice': 'INV-',
        'quote': 'QUO-',
        'sales_order': 'SO-',
        'purchase_order': 'PO-',
        'bill': 'BILL-'
      }

      const newSequence = {
        company_id: companyId,
        document_type: documentType,
        prefix: defaultPrefixes[documentType] || 'DOC-',
        suffix: '',
        current_number: 1,
        padding_zeros: 3,
        reset_yearly: true,
        financial_year: financialYear,
        is_active: true
      }

      const { data: createdSequence, error: createError } = await supabase
        .from('document_sequences')
        .insert([newSequence])
        .select()
        .single()

      if (createError) {
        throw createError
      }

      sequence = createdSequence
    } else if (error) {
      throw error
    }

    // Generate document number
    const paddedNumber = sequence.current_number.toString().padStart(sequence.padding_zeros, '0')
    const documentNumber = `${sequence.prefix}${paddedNumber}${sequence.suffix}`

    // Update current number
    const { error: updateError } = await supabase
      .from('document_sequences')
      .update({ current_number: sequence.current_number + 1 })
      .eq('id', sequence.id)

    if (updateError) {
      throw updateError
    }

    return {
      success: true,
      document_number: documentNumber,
      sequence: sequence
    }

  } catch (error) {
    console.error('Error generating document number:', error)
    return {
      success: false,
      error: 'Failed to generate document number'
    }
  }
}