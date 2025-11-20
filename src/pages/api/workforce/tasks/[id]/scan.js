// src/pages/api/workforce/tasks/[id]/scan.js
// Submit scanned item to task (called by mobile app)
import { supabaseAdmin } from '../../../../../services/utils/supabase'
import { withAuth } from '../../../../../lib/middleware'

async function handler(req, res) {
  const supabase = supabaseAdmin

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { id: taskId } = req.query
  const {
    item_id,
    item_name,
    item_code,
    barcode,
    quantity = 1,
    mrp
  } = req.body

  // Validate required fields
  if (!taskId) {
    return res.status(400).json({
      success: false,
      error: 'Task ID is required'
    })
  }

  if (!barcode) {
    return res.status(400).json({
      success: false,
      error: 'Barcode is required'
    })
  }

  if (!item_name) {
    return res.status(400).json({
      success: false,
      error: 'Item name is required'
    })
  }

  try {
    // Get user from auth middleware
    const userId = req.auth?.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }

    // Get task details and verify it's assigned to this user
    const { data: task, error: taskError } = await supabase
      .from('workforce_tasks')
      .select('id, company_id, assigned_to, status, customer_name')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }

    // Check if task is terminated
    if (task.status === 'terminated') {
      return res.status(410).json({
        success: false,
        error: 'Task terminated',
        message: 'This task was terminated because the invoice was closed or saved. No more items can be scanned.'
      })
    }

    // Check if task is cancelled
    if (task.status === 'cancelled') {
      return res.status(410).json({
        success: false,
        error: 'Task cancelled',
        message: 'This task was cancelled by the admin. No more items can be scanned.'
      })
    }

    // Check if task is completed
    if (task.status === 'completed') {
      return res.status(410).json({
        success: false,
        error: 'Task completed',
        message: 'This task was already completed. No more items can be scanned.'
      })
    }

    // Verify task is assigned to this user
    if (task.assigned_to !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Task not assigned to you',
        message: 'You can only scan items for tasks assigned to you.'
      })
    }

    // Insert scanned item into log
    // The database trigger will automatically:
    // 1. Update workforce_tasks.scanned_items JSONB array
    // 2. Change status from 'accepted' to 'in_progress' if first scan
    const { data: scannedItem, error: insertError } = await supabase
      .from('scanned_items_log')
      .insert({
        task_id: taskId,
        company_id: task.company_id,
        item_id,
        item_name,
        item_code,
        barcode,
        quantity: parseFloat(quantity),
        mrp: mrp ? parseFloat(mrp) : null,
        scanned_by: userId
      })
      .select(`
        id,
        task_id,
        item_id,
        item_name,
        item_code,
        barcode,
        quantity,
        mrp,
        scanned_at,
        scanned_by
      `)
      .single()

    if (insertError) {
      console.error('Error inserting scanned item:', insertError)
      return res.status(500).json({
        success: false,
        error: 'Failed to save scanned item',
        details: insertError.message
      })
    }

    // Fetch updated task to get current scanned_items count
    const { data: updatedTask, error: fetchError } = await supabase
      .from('workforce_tasks')
      .select('id, status, scanned_items')
      .eq('id', taskId)
      .single()

    if (fetchError) {
      console.error('Error fetching updated task:', fetchError)
      // Don't fail the request, just log it
    }

    const itemsCount = updatedTask?.scanned_items?.length || 0

    console.log('✅ Item scanned successfully:', {
      taskId,
      itemName: item_name,
      barcode,
      quantity,
      totalItemsScanned: itemsCount,
      taskStatus: updatedTask?.status
    })

    return res.status(201).json({
      success: true,
      data: scannedItem,
      task: {
        id: updatedTask?.id,
        status: updatedTask?.status,
        totalItemsScanned: itemsCount
      },
      message: `Item "${item_name}" scanned successfully. Total items: ${itemsCount}`
    })
  } catch (error) {
    console.error('Error in scan item:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to save scanned item',
      details: error.message
    })
  }
}

export default withAuth(handler)
