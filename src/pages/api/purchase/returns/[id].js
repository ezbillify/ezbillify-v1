// pages/api/purchase/returns/[id].js
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'

async function handler(req, res) {
  const { method } = req
  const { id } = req.query

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Debit note ID is required'
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getReturn(req, res, id)
      case 'PUT':
        return await updateReturn(req, res, id)
      case 'DELETE':
        return await deleteReturn(req, res, id)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Return API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getReturn(req, res, returnId) {
  const { company_id } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  const { data: debitNote, error } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(id, vendor_name, vendor_code, email, phone, gstin, billing_address, shipping_address),
      items:purchase_document_items(
        *,
        item:items(item_name, item_code, current_stock),
        unit:units(unit_name, unit_symbol)
      ),
      bill:purchase_documents!parent_document_id(id, document_number, document_date, total_amount, payment_status)
    `)
    .eq('id', returnId)
    .eq('company_id', company_id)
    .eq('document_type', 'debit_note')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Debit note not found'
      })
    }

    console.error('Error fetching debit note:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch debit note'
    })
  }

  return res.status(200).json({
    success: true,
    data: debitNote
  })
}

async function updateReturn(req, res, returnId) {
  const { 
    company_id,
    document_date,
    return_reason,
    notes,
    status
  } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  // Check if debit note exists
  const { data: existingReturn, error: fetchError } = await supabaseAdmin
    .from('purchase_documents')
    .select('*')
    .eq('id', returnId)
    .eq('company_id', company_id)
    .eq('document_type', 'debit_note')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Debit note not found'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch debit note'
    })
  }

  // Only allow updating draft debit notes
  if (existingReturn.status !== 'draft' && status !== existingReturn.status) {
    return res.status(400).json({
      success: false,
      error: 'Can only update draft debit notes'
    })
  }

  // Simple update (no items modification)
  let updateData = {
    updated_at: new Date().toISOString()
  }

  if (document_date !== undefined) updateData.document_date = document_date
  if (return_reason !== undefined) updateData.return_reason = return_reason
  if (notes !== undefined) updateData.notes = notes
  if (status !== undefined) updateData.status = status

  const { error: updateError } = await supabaseAdmin
    .from('purchase_documents')
    .update(updateData)
    .eq('id', returnId)

  if (updateError) {
    console.error('Error updating debit note:', updateError)
    return res.status(500).json({
      success: false,
      error: 'Failed to update debit note'
    })
  }

  // Fetch updated debit note
  const { data: updatedReturn } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code, email, phone),
      items:purchase_document_items(*),
      bill:purchase_documents!parent_document_id(document_number, document_date, payment_status)
    `)
    .eq('id', returnId)
    .single()

  return res.status(200).json({
    success: true,
    message: 'Debit note updated successfully',
    data: updatedReturn
  })
}

async function deleteReturn(req, res, returnId) {
  const { company_id } = req.body

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  console.log(`\n🗑️  === DELETING DEBIT NOTE ${returnId} ===`)

  // ✅ STEP 1: Fetch debit note with all details
  const { data: debitNote, error: fetchError } = await supabaseAdmin
    .from('purchase_documents')
    .select(`
      *,
      items:purchase_document_items(*),
      vendor:vendors(id, vendor_name, advance_amount),
      bill:purchase_documents!parent_document_id(
        id,
        document_number,
        payment_status,
        balance_amount
      )
    `)
    .eq('id', returnId)
    .eq('company_id', company_id)
    .eq('document_type', 'debit_note')
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Debit note not found'
      })
    }

    console.error('❌ Error fetching debit note:', fetchError)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch debit note'
    })
  }

  console.log(`📋 Debit Note: ${debitNote.document_number}`)
  console.log(`📊 Status: ${debitNote.status}`)
  console.log(`💰 Total Amount: ₹${debitNote.total_amount}`)
  console.log(`📦 Items: ${debitNote.items?.length || 0}`)
  console.log(`🏢 Vendor: ${debitNote.vendor?.vendor_name}`)
  console.log(`💳 Bill Payment Status: ${debitNote.bill?.payment_status}`)

  // 🔥 ALLOW DELETION OF BOTH DRAFT AND APPROVED
  if (debitNote.status !== 'draft' && debitNote.status !== 'approved') {
    return res.status(400).json({
      success: false,
      error: 'Can only delete draft or approved debit notes'
    })
  }

  const isBillPaid = debitNote.bill?.payment_status === 'paid'
  const debitNoteAmount = parseFloat(debitNote.total_amount || 0)

  try {
    // ✅ STEP 2: Reverse inventory movements (add stock back)
    console.log('\n📦 === REVERSING INVENTORY MOVEMENTS ===')
    
    if (debitNote.items && debitNote.items.length > 0) {
      for (let i = 0; i < debitNote.items.length; i++) {
        const item = debitNote.items[i]
        
        console.log(`[${i + 1}/${debitNote.items.length}] Reversing: ${item.item_name}, Qty: ${item.quantity}`)
        
        try {
          // Create OPPOSITE inventory movement (IN because we're reversing an OUT)
          const { error: movementError } = await supabaseAdmin
            .from('inventory_movements')
            .insert({
              company_id,
              item_id: item.item_id,
              item_code: item.item_code,
              movement_type: 'in', // Reverse the OUT movement
              quantity: item.quantity,
              rate: item.rate,
              value: item.total_amount,
              reference_type: 'debit_note_reversal',
              reference_id: returnId,
              reference_number: `${debitNote.document_number}-DELETED`,
              notes: `Reversal: Deleted Debit Note #${debitNote.document_number}`,
              movement_date: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString()
            })

          if (movementError) {
            console.error(`   ❌ Reversal movement failed:`, movementError)
          } else {
            console.log(`   ✅ Stock reversed (trigger updates automatically)`)
          }

        } catch (error) {
          console.error(`❌ Error reversing ${item.item_name}:`, error)
        }
      }
      
      console.log('✅ All inventory movements reversed')
    }

    // ✅ STEP 3: Handle Bill Balance & Vendor Advance Reversal
    console.log('\n💰 === REVERSING BILL/ADVANCE CHANGES ===')
    
    if (isBillPaid) {
      // 🔥 PAID BILL: DELETE the vendor advance record (don't create a utilized record)
      console.log(`💰 Bill was PAID - Deleting vendor advance of ₹${debitNoteAmount.toFixed(2)}`)
      
      // Find and DELETE the original advance record created by this debit note
      const { data: existingAdvance, error: findAdvanceError } = await supabaseAdmin
        .from('vendor_advances')
        .select('*')
        .eq('source_type', 'debit_note')
        .eq('source_id', returnId)
        .eq('advance_type', 'created')
        .maybeSingle()

      if (findAdvanceError) {
        console.error('❌ Error finding advance record:', findAdvanceError)
      } else if (existingAdvance) {
        // Delete the advance record
        const { error: deleteAdvanceError } = await supabaseAdmin
          .from('vendor_advances')
          .delete()
          .eq('id', existingAdvance.id)

        if (deleteAdvanceError) {
          console.error('❌ Failed to delete advance record:', deleteAdvanceError)
        } else {
          console.log('✅ Advance record deleted:', existingAdvance.id)
        }
      } else {
        console.log('⚠️  No advance record found to delete')
      }
      
      // Update vendor's advance_amount (subtract the advance)
      const currentAdvance = parseFloat(debitNote.vendor.advance_amount || 0)
      const newAdvanceBalance = Math.max(0, currentAdvance - debitNoteAmount)
      
      const { error: vendorUpdateError } = await supabaseAdmin
        .from('vendors')
        .update({
          advance_amount: newAdvanceBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', debitNote.vendor_id)

      if (vendorUpdateError) {
        console.error('❌ Failed to update vendor advance balance:', vendorUpdateError)
      } else {
        console.log(`✅ Vendor advance reversed: ₹${currentAdvance.toFixed(2)} → ₹${newAdvanceBalance.toFixed(2)}`)
      }
      
      // Bill balance stays the same (was already paid)
      console.log('ℹ️  Bill balance unchanged (was already paid)')
      
    } else {
      // 🔥 UNPAID BILL: Add back to bill balance (reverse the reduction)
      console.log(`💳 Bill was UNPAID - Adding back ₹${debitNoteAmount.toFixed(2)} to bill balance`)
      
      const currentBillBalance = parseFloat(debitNote.bill?.balance_amount || 0)
      const newBillBalance = currentBillBalance + debitNoteAmount
      
      const { error: billUpdateError } = await supabaseAdmin
        .from('purchase_documents')
        .update({
          balance_amount: newBillBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', debitNote.parent_document_id)
      
      if (billUpdateError) {
        console.error('❌ Error updating bill balance:', billUpdateError)
      } else {
        console.log(`✅ Bill balance restored: ₹${currentBillBalance.toFixed(2)} → ₹${newBillBalance.toFixed(2)}`)
      }
      
      console.log('ℹ️  No advance to delete (bill was unpaid)')
    }

    // ✅ STEP 4: Delete inventory movements related to this debit note
    console.log('\n🗑️  Deleting original inventory movements...')
    const { error: deleteMovementsError } = await supabaseAdmin
      .from('inventory_movements')
      .delete()
      .eq('reference_type', 'debit_note')
      .eq('reference_id', returnId)

    if (deleteMovementsError) {
      console.error('⚠️  Error deleting inventory movements:', deleteMovementsError)
    } else {
      console.log('✅ Original inventory movements deleted')
    }

    // ✅ STEP 5: Delete debit note (CASCADE will delete items)
    console.log('\n🗑️  Deleting debit note...')
    const { error: deleteError } = await supabaseAdmin
      .from('purchase_documents')
      .delete()
      .eq('id', returnId)
      .eq('company_id', company_id)

    if (deleteError) {
      console.error('❌ Error deleting debit note:', deleteError)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete debit note'
      })
    }

    console.log('✅ Debit note deleted successfully')
    console.log('✅ Vendor balance will be updated by database trigger')

    console.log('\n🎉 === DELETION COMPLETED ===')
    console.log('📊 Summary:')
    console.log(`   Debit Note: ${debitNote.document_number}`)
    console.log(`   Items Reversed: ${debitNote.items?.length || 0}`)
    console.log(`   Amount: ₹${debitNoteAmount.toFixed(2)}`)
    console.log(`   Bill Status: ${debitNote.bill?.payment_status}`)
    console.log(`   Advance Reversed: ${isBillPaid ? 'YES ✅' : 'NO'}`)
    if (isBillPaid) {
      const newAdvance = Math.max(0, parseFloat(debitNote.vendor.advance_amount || 0) - debitNoteAmount)
      console.log(`   New Vendor Advance: ₹${newAdvance.toFixed(2)}`)
    }

    return res.status(200).json({
      success: true,
      message: `Debit note ${debitNote.document_number} deleted successfully`,
      reversed: {
        items: debitNote.items?.length || 0,
        amount: debitNoteAmount,
        advance_reversed: isBillPaid,
        bill_balance_restored: !isBillPaid
      }
    })

  } catch (error) {
    console.error('❌ Error during deletion:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete debit note',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

export default withAuth(handler)