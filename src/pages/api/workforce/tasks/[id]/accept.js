// src/pages/api/workforce/tasks/[id]/accept.js
// Atomic task acceptance - first-come-first-served
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

    // Verify user is workforce or admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, company_id, first_name, last_name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return res.status(403).json({
        success: false,
        error: 'User not found'
      })
    }

    if (!['workforce', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only workforce or admin users can accept tasks'
      })
    }

    // ATOMIC OPERATION: Accept task only if still pending
    // This ensures first-come-first-served behavior
    const { data: task, error: updateError } = await supabase
      .from('workforce_tasks')
      .update({
        status: 'accepted',
        assigned_to: userId,
        accepted_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('status', 'pending') // CRITICAL: Only update if status is still pending
      .eq('company_id', user.company_id) // Ensure user belongs to same company
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
      console.error('Error accepting task:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to accept task',
        details: updateError.message
      })
    }

    // If no data returned, task was already accepted by someone else
    if (!task) {
      console.log('⚠️ Task already accepted:', { taskId, attemptedBy: userId })
      return res.status(409).json({
        success: false,
        error: 'Task already accepted by another user',
        message: 'Someone else has already accepted this task. Please try another task.'
      })
    }

    console.log('✅ Task accepted successfully:', {
      taskId: task.id,
      acceptedBy: user.email,
      customer: task.customer_name,
      acceptedAt: task.accepted_at
    })

    return res.status(200).json({
      success: true,
      data: task,
      message: 'Task accepted successfully. You can now start scanning items.'
    })
  } catch (error) {
    console.error('Error in accept task:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to accept task',
      details: error.message
    })
  }
}

export default withAuth(handler)
