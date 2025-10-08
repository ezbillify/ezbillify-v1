// pages/api/settings/document-numbering.js
import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side operations that bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export default async function handler(req, res) {
  console.log(`📝 Document Numbering API called: ${req.method}`)
  console.log('Query params:', req.query)
  console.log('Request body:', req.body)

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { method } = req

  try {
    switch (method) {
      case 'GET':
        // ✅ NEW: Support ?action=next to get next document number
        if (req.query.action === 'next') {
          return await getNextDocumentNumber(req, res)
        }
        return await getDocumentSequences(req, res)
      case 'POST':
        return await saveDocumentSequences(req, res)
      case 'PUT':
        return await updateSequence(req, res)
      case 'DELETE':
        return await deleteSequence(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('🚨 Document numbering API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    })
  }
}

async function getDocumentSequences(req, res) {
  const { company_id } = req.query
  console.log('🔍 GET request for company_id:', company_id)

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // First check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ Supabase environment variables not configured')
      return res.status(500).json({
        success: false,
        error: 'Database not configured',
        details: 'Please configure your Supabase environment variables'
      })
    }

    // Test basic connection with companies table
    console.log('🔗 Testing Supabase connection...')
    const { data: companyTest, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .single()

    if (companyError) {
      console.error('❌ Company lookup failed:', companyError)
      if (companyError.message.includes('Supabase not configured')) {
        return res.status(500).json({
          success: false,
          error: 'Database not configured',
          details: 'Please check your Supabase environment variables'
        })
      }
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      })
    }

    console.log('✅ Company found, fetching sequences...')

    // Get current financial year
    const currentFY = getCurrentFinancialYear()
    console.log('📅 Current Financial Year:', currentFY)
    
    // Fetch existing document sequences
    const { data: sequences, error } = await supabase
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .order('document_type')

    if (error && !error.message.includes('relation "document_sequences" does not exist')) {
      console.error('❌ Error fetching sequences:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch document sequences',
        details: error.message
      })
    }

    console.log(`📊 Found ${sequences?.length || 0} existing sequences`)

    // Create response with default sequences for missing types
    const documentTypes = [
      'invoice', 'quote', 'sales_order', 'purchase_order', 
      'bill', 'payment_received', 'payment_made', 'credit_note', 'debit_note'
    ]

    const result = []
    for (const docType of documentTypes) {
      const existingSequence = sequences?.find(s => s.document_type === docType)
      
      if (existingSequence) {
        result.push({
          ...existingSequence,
          sample_format: generateSampleFormat(existingSequence)
        })
      } else {
        // Return default sequence structure (not saved to DB yet)
        const defaultSequence = createDefaultSequence(company_id, docType, currentFY)
        result.push({
          ...defaultSequence,
          sample_format: generateSampleFormat(defaultSequence)
        })
      }
    }

    console.log(`✅ Returning ${result.length} sequences`)

    return res.status(200).json({
      success: true,
      data: result,
      financial_year: currentFY
    })

  } catch (error) {
    console.error('🚨 Error in getDocumentSequences:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch document sequences',
      details: error.message
    })
  }
}

// ✅ NEW FUNCTION: Get next document number
async function getNextDocumentNumber(req, res) {
  const { company_id, document_type } = req.query
  
  console.log('🔍 Getting next document number:', { company_id, document_type })

  if (!company_id || !document_type) {
    return res.status(400).json({
      success: false,
      error: 'Company ID and document type are required'
    })
  }

  try {
    const currentFY = getCurrentFinancialYear()
    
    // Fetch sequence for this document type
    const { data: sequence, error } = await supabase
      .from('document_sequences')
      .select('*')
      .eq('company_id', company_id)
      .eq('document_type', document_type)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('❌ Error fetching sequence:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch document sequence',
        details: error.message
      })
    }

    // If no sequence found, return default
    if (!sequence) {
      console.log('⚠️ No sequence found, using default')
      const defaultPrefixes = {
        'bill': 'BILL-',
        'invoice': 'INV-',
        'purchase_order': 'PO-',
        'quote': 'QUO-',
        'sales_order': 'SO-',
        'payment_received': 'PR-',
        'payment_made': 'PM-',
        'credit_note': 'CN-',
        'debit_note': 'DN-'
      }
      
      const prefix = defaultPrefixes[document_type] || 'DOC-'
      const nextNumber = `${prefix}0001`
      
      return res.status(200).json({
        success: true,
        data: {
          next_number: nextNumber,
          formatted_number: nextNumber
        }
      })
    }

    // Check if we need to reset for new financial year
    if (sequence.reset_yearly && sequence.financial_year !== currentFY) {
      console.log('📅 Resetting for new financial year:', currentFY)
      
      // Reset the sequence for new FY
      const { error: updateError } = await supabase
        .from('document_sequences')
        .update({
          current_number: 1,
          financial_year: currentFY,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequence.id)
      
      if (updateError) {
        console.error('❌ Error resetting sequence:', updateError)
      }
      
      sequence.current_number = 1
      sequence.financial_year = currentFY
    }

    // Format the next number
    const paddedNumber = sequence.current_number.toString().padStart(sequence.padding_zeros || 3, '0')
    const nextNumber = `${sequence.prefix || ''}${paddedNumber}${sequence.suffix || ''}`
    
    console.log('✅ Next number generated:', nextNumber)

    return res.status(200).json({
      success: true,
      data: {
        next_number: nextNumber,
        formatted_number: nextNumber,
        sequence_id: sequence.id,
        current_number: sequence.current_number
      }
    })

  } catch (error) {
    console.error('🚨 Error in getNextDocumentNumber:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to generate next document number',
      details: error.message
    })
  }
}

async function saveDocumentSequences(req, res) {
  const { company_id, sequences } = req.body

  console.log('💾 Save request:', { 
    company_id, 
    sequences_count: sequences?.length,
    sequences_preview: sequences?.slice(0, 2)
  })

  if (!company_id || !sequences || !Array.isArray(sequences)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request data. Company ID and sequences array are required.'
    })
  }

  if (sequences.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No sequences provided'
    })
  }

  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      })
    }

    // Verify company exists
    console.log('🔍 Verifying company exists...')
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .single()

    if (companyError || !company) {
      console.error('❌ Company not found:', companyError)
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      })
    }

    console.log('✅ Company verified')

    const currentFY = getCurrentFinancialYear()
    const results = []
    const errors = []

    // Process each sequence individually
    for (let i = 0; i < sequences.length; i++) {
      const seq = sequences[i]
      console.log(`📝 Processing sequence ${i + 1}/${sequences.length}: ${seq.document_type}`)

      if (!seq.document_type) {
        console.warn('⚠️ Skipping sequence without document_type:', seq)
        errors.push(`Sequence ${i + 1}: Missing document type`)
        continue
      }

      try {
        // Check if sequence exists
        const { data: existingSequence } = await supabase
          .from('document_sequences')
          .select('id')
          .eq('company_id', company_id)
          .eq('document_type', seq.document_type)
          .eq('financial_year', seq.reset_yearly ? currentFY : null)
          .maybeSingle()

        const sequenceData = {
          company_id,
          document_type: seq.document_type,
          prefix: seq.prefix || '',
          suffix: seq.suffix || '',
          current_number: Math.max(1, parseInt(seq.current_number) || 1),
          padding_zeros: Math.max(1, Math.min(10, parseInt(seq.padding_zeros) || 3)),
          reset_yearly: Boolean(seq.reset_yearly),
          financial_year: seq.reset_yearly ? currentFY : null,
          sample_format: generateSampleFormat(seq),
          is_active: true,
          updated_at: new Date().toISOString()
        }

        console.log(`📊 Sequence data for ${seq.document_type}:`, {
          prefix: sequenceData.prefix,
          current_number: sequenceData.current_number,
          suffix: sequenceData.suffix,
          reset_yearly: sequenceData.reset_yearly,
          financial_year: sequenceData.financial_year
        })

        if (existingSequence) {
          console.log(`🔄 Updating existing sequence: ${seq.document_type}`)
          // Update existing sequence
          const { data: updated, error: updateError } = await supabase
            .from('document_sequences')
            .update(sequenceData)
            .eq('id', existingSequence.id)
            .select()
            .single()

          if (updateError) {
            console.error(`❌ Error updating ${seq.document_type}:`, updateError)
            errors.push(`${seq.document_type}: ${updateError.message}`)
            continue
          }
          console.log(`✅ Updated ${seq.document_type}`)
          results.push(updated)
        } else {
          console.log(`➕ Creating new sequence: ${seq.document_type}`)
          // Create new sequence
          sequenceData.created_at = new Date().toISOString()
          
          const { data: created, error: createError } = await supabase
            .from('document_sequences')
            .insert(sequenceData)
            .select()
            .single()

          if (createError) {
            console.error(`❌ Error creating ${seq.document_type}:`, createError)
            errors.push(`${seq.document_type}: ${createError.message}`)
            continue
          }
          console.log(`✅ Created ${seq.document_type}`)
          results.push(created)
        }
      } catch (seqError) {
        console.error(`🚨 Error processing sequence ${seq.document_type}:`, seqError)
        errors.push(`${seq.document_type}: ${seqError.message}`)
        continue
      }
    }

    console.log(`📈 Processing complete: ${results.length} succeeded, ${errors.length} failed`)

    if (results.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save any sequences',
        details: errors
      })
    }

    // Return success even if some sequences failed
    return res.status(200).json({
      success: true,
      message: `Successfully saved ${results.length} sequences${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('🚨 Error in saveDocumentSequences:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to save document sequences',
      details: error.message
    })
  }
}

async function updateSequence(req, res) {
  const { sequence_id, updates } = req.body

  if (!sequence_id || !updates) {
    return res.status(400).json({
      success: false,
      error: 'Sequence ID and updates are required'
    })
  }

  try {
    const { data, error } = await supabase
      .from('document_sequences')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sequence_id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update sequence',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Sequence updated successfully',
      data: data
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update sequence',
      details: error.message
    })
  }
}

async function deleteSequence(req, res) {
  const { sequence_id } = req.body

  if (!sequence_id) {
    return res.status(400).json({
      success: false,
      error: 'Sequence ID is required'
    })
  }

  try {
    const { error } = await supabase
      .from('document_sequences')
      .delete()
      .eq('id', sequence_id)

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete sequence',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Sequence deleted successfully'
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete sequence',
      details: error.message
    })
  }
}

// Helper Functions
function getCurrentFinancialYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`
  }
}

function createDefaultSequence(company_id, document_type, financial_year) {
  const defaultPrefixes = {
    'invoice': 'INV-',
    'quote': 'QUO-',
    'sales_order': 'SO-',
    'purchase_order': 'PO-',
    'bill': 'BILL-',
    'payment_received': 'PR-',
    'payment_made': 'PM-',
    'credit_note': 'CN-',
    'debit_note': 'DN-'
  }

  return {
    company_id,
    document_type,
    prefix: defaultPrefixes[document_type] || 'DOC-',
    suffix: '',
    current_number: 1,
    padding_zeros: 3,
    reset_yearly: true,
    financial_year: financial_year,
    is_active: true
  }
}

function generateSampleFormat(sequence) {
  const paddedNumber = (sequence.current_number || 1).toString().padStart(sequence.padding_zeros || 3, '0')
  let result = `${sequence.prefix || ''}${paddedNumber}${sequence.suffix || ''}`
  
  if (sequence.reset_yearly && sequence.financial_year) {
    result += ` (FY ${sequence.financial_year})`
  }
  
  return result
}