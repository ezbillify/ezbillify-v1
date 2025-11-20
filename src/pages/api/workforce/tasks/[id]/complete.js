// src/pages/api/workforce/tasks/[id]/complete.js
// Complete workforce task (called by mobile app when done scanning)
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

  if (!taskId) {
    return res.status(400).json({
      success: false,
      error: 'Task ID is required'
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

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('workforce_tasks')
      .select('id, company_id, assigned_to, status, customer_name, scanned_items')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }

    // Verify task is assigned to this user
    if (task.assigned_to !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Task not assigned to you',
        message: 'You can only complete tasks assigned to you.'
      })
    }

    // Check if task can be completed
    if (!['accepted', 'in_progress'].includes(task.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot complete task with status: ${task.status}`,
        message: `Task is already ${task.status}.`
      })
    }

    // Update task status to completed
    const { data: completedTask, error: updateError } = await supabase
      .from('workforce_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select(`
        id,
        company_id,
        created_by,
        assigned_to,
        task_type,
        status,
        customer_id,
        customer_name,
        scanned_items,
        accepted_at,
        started_at,
        completed_at,
        created_at,
        updated_at,
        assignee:users!assigned_to(id, first_name, last_name)
      `)
      .single()

    if (updateError) {
      console.error('Error completing task:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to complete task',
        details: updateError.message
      })
    }

    const itemsCount = completedTask.scanned_items?.length || 0

    console.log('✅ Task completed successfully:', {
      taskId: completedTask.id,
      customer: completedTask.customer_name,
      totalItemsScanned: itemsCount,
      completedAt: completedTask.completed_at
    })

    return res.status(200).json({
      success: true,
      data: completedTask,
      message: `Task completed successfully. Total items scanned: ${itemsCount}`
    })
  } catch (error) {
    console.error('Error in complete task:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to complete task',
      details: error.message
    })
  }
}

export default withAuth(handler)
