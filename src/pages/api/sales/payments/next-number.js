// pages/api/sales/payments/next-number.js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  if (method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { company_id, branch_id } = req.query

  if (!company_id || !branch_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and branch ID are required'
    })
  }

  try {
    // Get financial year
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1
    const fyEndYear = fyStartYear + 1
    const currentFY = `${fyStartYear}-${fyEndYear.toString().padStart(4, '0')}`

    // Get branch details
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('document_prefix, name')
      .eq('id', branch_id)
      .eq('company_id', company_id)
      .single()

    if (branchError || !branch) {
      return res.status(400).json({
        success: false,
        error: 'Branch not found'
      })
    }

    const branchPrefix = branch.document_prefix || 'BR'

    // Get document sequence
    const { data: sequence, error: sequenceError } = await supabaseAdmin
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('branch_id', branch_id)
      .eq('document_type', 'payment_received')
      .eq('is_active', true)
      .maybeSingle()

    let documentNumber
    let currentNumber

    if (!sequence) {
      // Create new sequence if it doesn't exist
      const { data: newSequence, error: createSeqError } = await supabaseAdmin
        .from('document_sequences')
        .insert({
          company_id,
          branch_id,
          document_type: 'payment_received',
          prefix: 'PY-',
          current_number: 1,
          padding_zeros: 4,
          financial_year: currentFY,
          reset_frequency: 'yearly',
          is_active: true
        })
        .select()
        .single()

      if (createSeqError) {
        console.error('Error creating sequence:', createSeqError)
        return res.status(500).json({
          success: false,
          error: 'Failed to create document sequence'
        })
      }

      currentNumber = 1
      const paddedNumber = currentNumber.toString().padStart(4, '0')
      documentNumber = `${branchPrefix}-PY-${paddedNumber}/${currentFY.substring(2)}`
    } else {
      // Check if we need to reset for new financial year
      if (sequence.financial_year !== currentFY && sequence.reset_frequency === 'yearly') {
        const { error: resetError } = await supabaseAdmin
          .from('document_sequences')
          .update({
            current_number: 1,
            financial_year: currentFY,
            updated_at: new Date().toISOString()
          })
          .eq('id', sequence.id)

        if (resetError) {
          console.error('Error resetting sequence:', resetError)
          return res.status(500).json({
            success: false,
            error: 'Failed to reset sequence'
          })
        }

        currentNumber = 1
      } else {
        currentNumber = sequence.current_number
      }

      const paddedNumber = currentNumber.toString().padStart(sequence.padding_zeros || 4, '0')
      documentNumber = `${branchPrefix}-${sequence.prefix || ''}${paddedNumber}/${currentFY.substring(2)}`
      
      // Increment the sequence number in the database for next use
      const { error: updateError } = await supabaseAdmin
        .from('document_sequences')
        .update({
          current_number: currentNumber + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequence.id)

      if (updateError) {
        console.error('Warning: Failed to update sequence number:', updateError)
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        document_number: documentNumber,
        current_number: currentNumber
      }
    })

  } catch (error) {
    console.error('Error generating next payment number:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate next payment number'
    })
  }
}

export default withAuth(handler)