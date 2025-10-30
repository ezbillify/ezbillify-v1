import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getJournalEntries(req, res)
      case 'POST':
        return await createJournalEntry(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Journal Entries API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getJournalEntries(req, res) {
  const { 
    company_id, 
    from_date, 
    to_date, 
    status,
    page = 1,
    limit = 50
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    let query = supabaseAdmin
      .from('journal_entries')
      .select(`
        *,
        items:journal_entry_items(
          *,
          account:chart_of_accounts(account_code, account_name)
        ),
        created_by_user:users(id, name)
      `, { count: 'exact' })
      .eq('company_id', company_id)

    if (from_date) {
      query = query.gte('entry_date', from_date)
    }

    if (to_date) {
      query = query.lte('entry_date', to_date)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('entry_date', { ascending: false })

    const offset = (parseInt(page) - 1) * parseInt(limit)
    query = query.range(offset, offset + parseInt(limit) - 1)

    const { data, error, count } = await query

    if (error) throw error

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil((count || 0) / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Error fetching journal entries:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch journal entries'
    })
  }
}

async function createJournalEntry(req, res) {
  const { company_id, entry_date, narration, reference_type, reference_number, items } = req.body

  // Validate required fields
  if (!company_id || !entry_date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Company ID, entry date, and items are required'
    })
  }

  // Validate that debit and credit amounts balance
  const totalDebit = items.reduce((sum, item) => sum + (parseFloat(item.debit_amount) || 0), 0)
  const totalCredit = items.reduce((sum, item) => sum + (parseFloat(item.credit_amount) || 0), 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({
      success: false,
      error: 'Debit and credit amounts must balance'
    })
  }

  try {
    // Generate entry number
    const entryNumber = await generateEntryNumber(company_id, entry_date)

    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabaseAdmin
      .from('journal_entries')
      .insert({
        company_id,
        entry_number: entryNumber,
        entry_date,
        narration,
        reference_type: reference_type || null,
        reference_number: reference_number || null,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: 'posted',
        created_by: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (entryError) throw entryError

    // Create journal entry items
    const itemsToInsert = items.map(item => ({
      journal_entry_id: journalEntry.id,
      account_id: item.account_id,
      debit_amount: parseFloat(item.debit_amount) || 0,
      credit_amount: parseFloat(item.credit_amount) || 0,
      description: item.description || null
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('journal_entry_items')
      .insert(itemsToInsert)

    if (itemsError) {
      // Rollback: delete the journal entry
      await supabaseAdmin
        .from('journal_entries')
        .delete()
        .eq('id', journalEntry.id)

      throw itemsError
    }

    // Update account balances
    for (const item of items) {
      const { data: account } = await supabaseAdmin
        .from('chart_of_accounts')
        .select('current_balance')
        .eq('id', item.account_id)
        .single()

      if (account) {
        const newBalance = (account.current_balance || 0) + 
                          (parseFloat(item.debit_amount) || 0) - 
                          (parseFloat(item.credit_amount) || 0)

        await supabaseAdmin
          .from('chart_of_accounts')
          .update({
            current_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.account_id)
      }
    }

    // Fetch complete journal entry
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
      .eq('id', journalEntry.id)
      .single()

    return res.status(201).json({
      success: true,
      message: 'Journal entry created successfully',
      data: completeEntry
    })
  } catch (error) {
    console.error('Error creating journal entry:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create journal entry',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function generateEntryNumber(company_id, entry_date) {
  try {
    // Get the year from entry date
    const year = new Date(entry_date).getFullYear()
    
    // Find the latest entry for this company and year
    const { data } = await supabaseAdmin
      .from('journal_entries')
      .select('entry_number')
      .eq('company_id', company_id)
      .like('entry_number', `JE-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (data && data.length > 0) {
      const match = data[0].entry_number.match(new RegExp(`JE-${year}-(\\d+)`))
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }

    return `JE-${year}-${nextNumber.toString().padStart(6, '0')}`
  } catch (error) {
    console.error('Error generating entry number:', error)
    // Fallback to timestamp-based number
    return `JE-${Date.now()}`
  }
}

export default withAuth(handler)