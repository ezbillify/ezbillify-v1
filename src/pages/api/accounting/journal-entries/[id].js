import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Journal entry ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getJournalEntry(req, res, id)
      case 'PUT':
        return await updateJournalEntry(req, res, id)
      case 'DELETE':
        return await deleteJournalEntry(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Journal Entry API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getJournalEntry(req, res, id) {
  try {
    const { data, error } = await supabaseAdmin
      .from('journal_entries')
      .select(`
        *,
        items:journal_entry_items(
          *,
          account:chart_of_accounts(account_code, account_name)
        ),
        created_by_user:users(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found'
      })
    }

    return res.status(200).json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error fetching journal entry:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch journal entry'
    })
  }
}

async function updateJournalEntry(req, res, id) {
  const { narration, reference_type, reference_number, items, status } = req.body

  try {
    // Fetch existing entry
    const { data: existingEntry, error: fetchError } = await supabaseAdmin
      .from('journal_entries')
      .select('company_id, total_debit, total_credit, status')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found'
      })
    }

    // Check if entry can be modified (only draft entries can be modified)
    if (existingEntry.status === 'posted' && status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Posted entries cannot be modified. Please cancel the entry first.'
      })
    }

    // If we have items, validate and update them
    if (items && Array.isArray(items) && items.length > 0) {
      // Validate that debit and credit amounts balance
      const totalDebit = items.reduce((sum, item) => sum + (parseFloat(item.debit_amount) || 0), 0)
      const totalCredit = items.reduce((sum, item) => sum + (parseFloat(item.credit_amount) || 0), 0)

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({
          success: false,
          error: 'Debit and credit amounts must balance'
        })
      }

      // Delete existing items
      await supabaseAdmin
        .from('journal_entry_items')
        .delete()
        .eq('journal_entry_id', id)

      // Create new items
      const itemsToInsert = items.map(item => ({
        journal_entry_id: id,
        account_id: item.account_id,
        debit_amount: parseFloat(item.debit_amount) || 0,
        credit_amount: parseFloat(item.credit_amount) || 0,
        description: item.description || null
      }))

      const { error: itemsError } = await supabaseAdmin
        .from('journal_entry_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      // Update journal entry totals
      const updateData = {
        narration: narration || existingEntry.narration,
        reference_type: reference_type || existingEntry.reference_type,
        reference_number: reference_number || existingEntry.reference_number,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: status || existingEntry.status,
        updated_at: new Date().toISOString()
      }

      const { data: updatedEntry, error: updateError } = await supabaseAdmin
        .from('journal_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      // Fetch complete updated entry
      const { data: completeEntry } = await supabaseAdmin
        .from('journal_entries')
        .select(`
          *,
          items:journal_entry_items(
            *,
            account:chart_of_accounts(account_code, account_name)
          ),
          created_by_user:users(id, name)
        `)
        .eq('id', id)
        .single()

      return res.status(200).json({
        success: true,
        message: 'Journal entry updated successfully',
        data: completeEntry
      })
    } else {
      // Update only the header information
      const updateData = {
        narration: narration || existingEntry.narration,
        reference_type: reference_type || existingEntry.reference_type,
        reference_number: reference_number || existingEntry.reference_number,
        status: status || existingEntry.status,
        updated_at: new Date().toISOString()
      }

      const { data: updatedEntry, error: updateError } = await supabaseAdmin
        .from('journal_entries')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      // Fetch complete updated entry
      const { data: completeEntry } = await supabaseAdmin
        .from('journal_entries')
        .select(`
          *,
          items:journal_entry_items(
            *,
            account:chart_of_accounts(account_code, account_name)
          ),
          created_by_user:users(id, name)
        `)
        .eq('id', id)
        .single()

      return res.status(200).json({
        success: true,
        message: 'Journal entry updated successfully',
        data: completeEntry
      })
    }
  } catch (error) {
    console.error('Error updating journal entry:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update journal entry',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function deleteJournalEntry(req, res, id) {
  try {
    // Fetch existing entry
    const { data: existingEntry, error: fetchError } = await supabaseAdmin
      .from('journal_entries')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        error: 'Journal entry not found'
      })
    }

    // Check if entry can be deleted (only draft entries can be deleted)
    if (existingEntry.status === 'posted') {
      return res.status(400).json({
        success: false,
        error: 'Posted entries cannot be deleted. Please cancel the entry first.'
      })
    }

    // Delete journal entry (items will be deleted by cascade)
    const { error: deleteError } = await supabaseAdmin
      .from('journal_entries')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return res.status(200).json({
      success: true,
      message: 'Journal entry deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting journal entry:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete journal entry',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)