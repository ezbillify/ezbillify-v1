// src/pages/api/workforce/tasks/[id]/index.js
// Get, update, or delete (cancel/terminate) workforce task
import { supabaseAdmin } from '../../../../../services/utils/supabase'
import { withAuth } from '../../../../../lib/middleware'

async function handler(req, res) {
  const supabase = supabaseAdmin

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  try {
    if (req.method === 'GET') {
      return await getTask(req, res, supabase)
    } else if (req.method === 'PUT') {
      return await updateTask(req, res, supabase)
    } else if (req.method === 'DELETE') {
      return await cancelTask(req, res, supabase)
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
      return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Workforce Task API Error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: error.message
    })
  }
}

/**
 * GET /api/workforce/tasks/[id]
 * Get task details with scanned items
 */
async function getTask(req, res, supabase) {
  const { id: taskId } = req.query

  if (!taskId) {
    return res.status(400).json({
      success: false,
      error: 'Task ID is required'
    })
  }

  try {
    const { data: task, error } = await supabase
      .from('workforce_tasks')
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
        cancelled_at,
        terminated_at,
        created_at,
        updated_at,
        creator:users!created_by(id, first_name, last_name),
        assignee:users!assigned_to(id, first_name, last_name)
      `)
      .eq('id', taskId)
      .single()

    if (error || !task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }

    return res.status(200).json({
      success: true,
      data: task
    })
  } catch (error) {
    console.error('Error fetching task:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch task',
      details: error.message
    })
  }
}

/**
 * PUT /api/workforce/tasks/[id]
 * Update task (e.g., terminate when invoice closed)
 */
async function updateTask(req, res, supabase) {
  const { id: taskId } = req.query
  const { action } = req.body

  if (!taskId) {
    return res.status(400).json({
      success: false,
      error: 'Task ID is required'
    })
  }

  if (!action) {
    return res.status(400).json({
      success: false,
      error: 'Action is required (e.g., "terminate")'
    })
  }

  try {
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
      .select('id, company_id, created_by, status')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }

    // Verify user is the creator (admin who sent the task)
    if (task.created_by !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the task creator can update this task'
      })
    }

    if (action === 'terminate') {
      // Terminate task (invoice was closed or saved)
      if (['completed', 'cancelled', 'terminated'].includes(task.status)) {
        return res.status(400).json({
          success: false,
          error: `Task is already ${task.status}`,
          message: 'Cannot terminate a task that is already finalized.'
        })
      }

      const { data: terminatedTask, error: updateError } = await supabase
        .from('workforce_tasks')
        .update({
          status: 'terminated',
          terminated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select(`
          id,
          company_id,
          created_by,
          assigned_to,
          task_type,
          status,
          customer_name,
          scanned_items,
          terminated_at,
          updated_at
        `)
        .single()

      if (updateError) {
        console.error('Error terminating task:', updateError)
        return res.status(500).json({
          success: false,
          error: 'Failed to terminate task',
          details: updateError.message
        })
      }

      console.log('✅ Task terminated:', {
        taskId: terminatedTask.id,
        customer: terminatedTask.customer_name,
        itemsScanned: terminatedTask.scanned_items?.length || 0,
        terminatedAt: terminatedTask.terminated_at
      })

      return res.status(200).json({
        success: true,
        data: terminatedTask,
        message: 'Task terminated successfully. Invoice was closed or saved.'
      })
    } else {
      return res.status(400).json({
        success: false,
        error: `Unknown action: ${action}`,
        message: 'Supported actions: "terminate"'
      })
    }
  } catch (error) {
    console.error('Error updating task:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update task',
      details: error.message
    })
  }
}

/**
 * DELETE /api/workforce/tasks/[id]
 * Cancel task (admin can cancel and reassign)
 */
async function cancelTask(req, res, supabase) {
  const { id: taskId } = req.query

  if (!taskId) {
    return res.status(400).json({
      success: false,
      error: 'Task ID is required'
    })
  }

  try {
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
      .select('id, company_id, created_by, status, customer_name, scanned_items')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      })
    }

    // Verify user is admin who created the task
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin users can cancel tasks'
      })
    }

    if (task.created_by !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the task creator can cancel this task'
      })
    }

    // Check if task can be cancelled
    if (['completed', 'cancelled', 'terminated'].includes(task.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel task with status: ${task.status}`,
        message: `Task is already ${task.status}.`
      })
    }

    // Update task status to cancelled
    const { data: cancelledTask, error: updateError } = await supabase
      .from('workforce_tasks')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select(`
        id,
        company_id,
        created_by,
        assigned_to,
        task_type,
        status,
        customer_name,
        scanned_items,
        cancelled_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Error cancelling task:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to cancel task',
        details: updateError.message
      })
    }

    console.log('✅ Task cancelled:', {
      taskId: cancelledTask.id,
      customer: cancelledTask.customer_name,
      itemsScanned: cancelledTask.scanned_items?.length || 0,
      cancelledAt: cancelledTask.cancelled_at
    })

    return res.status(200).json({
      success: true,
      data: cancelledTask,
      message: 'Task cancelled successfully. You can create a new task if needed.'
    })
  } catch (error) {
    console.error('Error cancelling task:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel task',
      details: error.message
    })
  }
}

export default withAuth(handler)
