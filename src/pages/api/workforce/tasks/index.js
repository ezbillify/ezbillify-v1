// src/pages/api/workforce/tasks/index.js
// Workforce tasks API - Create and list tasks
import { supabaseAdmin } from '../../../../services/utils/supabase'
import { withAuth } from '../../../../lib/middleware'
import { notifyWorkforceUsers } from '../../../../services/fcmService'

async function handler(req, res) {
  const supabase = supabaseAdmin

  // Add cache control headers to prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  try {
    if (req.method === 'GET') {
      return await getTasks(req, res, supabase)
    } else if (req.method === 'POST') {
      return await createTask(req, res, supabase)
    } else {
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Workforce Tasks API Error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: error.message
    })
  }
}

/**
 * GET /api/workforce/tasks
 * List workforce tasks with filters
 */
async function getTasks(req, res, supabase) {
  const {
    company_id,
    status,
    assigned_to,
    created_by,
    from_date,
    to_date,
    page = 1,
    limit = 50,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query

  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  try {
    // Build query with relationships
    let query = supabase
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
      `, { count: 'exact' })
      .eq('company_id', company_id)

    // Apply filters
    if (status) {
      const statuses = status.split(',').map(s => s.trim())
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0])
      } else {
        query = query.in('status', statuses)
      }
    }

    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to)
    }

    if (created_by) {
      query = query.eq('created_by', created_by)
    }

    if (from_date) {
      query = query.gte('created_at', from_date)
    }

    if (to_date) {
      query = query.lte('created_at', to_date)
    }

    // Sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' })

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit)
    query = query.range(offset, offset + parseInt(limit) - 1)

    const { data: tasks, error, count } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch tasks',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Error in getTasks:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      details: error.message
    })
  }
}

/**
 * POST /api/workforce/tasks
 * Create a new workforce task
 */
async function createTask(req, res, supabase) {
  const {
    company_id,
    customer_id,
    customer_name
  } = req.body

  // Validate required fields
  if (!company_id) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    })
  }

  if (!customer_name) {
    return res.status(400).json({
      success: false,
      error: 'Customer name is required'
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

    // Verify user is admin in this company
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return res.status(403).json({
        success: false,
        error: 'User not found'
      })
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin users can create workforce tasks'
      })
    }

    if (user.company_id !== company_id) {
      return res.status(403).json({
        success: false,
        error: 'User does not belong to this company'
      })
    }

    // Create the task
    const { data: task, error: insertError } = await supabase
      .from('workforce_tasks')
      .insert({
        company_id,
        created_by: userId,
        customer_id,
        customer_name,
        task_type: 'barcode_scan',
        status: 'pending'
      })
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
        created_at,
        updated_at,
        creator:users!created_by(id, first_name, last_name)
      `)
      .single()

    if (insertError) {
      console.error('Error creating task:', insertError)
      return res.status(500).json({
        success: false,
        error: 'Failed to create task',
        details: insertError.message
      })
    }

    console.log('✅ Workforce task created:', {
      taskId: task.id,
      companyId: task.company_id,
      customer: task.customer_name,
      status: task.status
    })

    // Send Firebase Cloud Messaging notifications to workforce users
    try {
      const notificationResult = await notifyWorkforceUsers(
        supabase,
        company_id,
        task
      )

      console.log('📱 Push notification result:', notificationResult)
    } catch (notificationError) {
      // Log error but don't fail the task creation
      console.error('⚠️ Failed to send push notifications:', notificationError)
    }

    return res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully. Workforce users will be notified.'
    })
  } catch (error) {
    console.error('Error in createTask:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to create task',
      details: error.message
    })
  }
}

export default withAuth(handler)
