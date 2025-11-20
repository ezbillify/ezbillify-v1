// src/components/workforce/WorkforceTaskMonitor.js
// Real-time task status monitor for Invoice Form
import React, { useState, useEffect } from 'react'
import { workforceRealtimeHelpers } from '../../services/utils/supabase'
import { useAPI } from '../../hooks/useAPI'

const WorkforceTaskMonitor = ({
  taskId,
  onItemsReceived,
  onCancel
}) => {
  const { authenticatedFetch } = useAPI()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  // Load initial task data
  useEffect(() => {
    if (!taskId) return

    const loadTask = async () => {
      try {
        setLoading(true)
        const result = await authenticatedFetch(`/api/workforce/tasks/${taskId}`)

        if (result.success) {
          setTask(result.data)
          console.log('📋 Loaded task:', result.data)
        } else {
          setError(result.error || 'Failed to load task')
        }
      } catch (err) {
        console.error('Error loading task:', err)
        setError('Failed to load task')
      } finally {
        setLoading(false)
      }
    }

    loadTask()
  }, [taskId, authenticatedFetch])

  // Subscribe to real-time task updates
  useEffect(() => {
    if (!taskId) return

    console.log('🔄 Subscribing to task updates:', taskId)

    const taskChannel = workforceRealtimeHelpers.subscribeToTask(
      taskId,
      (payload) => {
        console.log('📡 Task update received:', payload)

        if (payload.eventType === 'UPDATE') {
          const updatedTask = payload.new
          setTask(updatedTask)

          // If task completed, notify parent with scanned items
          if (updatedTask.status === 'completed') {
            console.log('✅ Task completed! Items:', updatedTask.scanned_items?.length)
            onItemsReceived?.(updatedTask.scanned_items || [])
          }

          // If task cancelled or terminated, notify parent
          if (['cancelled', 'terminated'].includes(updatedTask.status)) {
            console.log(`⚠️ Task ${updatedTask.status}`)
            onCancel?.()
          }
        }
      }
    )

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Unsubscribing from task updates')
      workforceRealtimeHelpers.unsubscribe(taskChannel)
    }
  }, [taskId, onItemsReceived, onCancel])

  // Auto-refresh task status every 2 seconds when active
  useEffect(() => {
    if (!taskId || !task) return
    
    // Only refresh for active statuses
    if (!['pending', 'accepted', 'in_progress'].includes(task.status)) return

    const intervalId = setInterval(async () => {
      try {
        const result = await authenticatedFetch(`/api/workforce/tasks/${taskId}`)
        if (result.success) {
          setTask(result.data)
          
          // Check if status changed to completed
          if (result.data.status === 'completed') {
            console.log('✅ Task completed via polling! Items:', result.data.scanned_items?.length)
            onItemsReceived?.(result.data.scanned_items || [])
          }
        }
      } catch (err) {
        console.error('Error polling task status:', err)
      }
    }, 2000) // Refresh every 2 seconds

    return () => clearInterval(intervalId)
  }, [taskId, task?.status, authenticatedFetch, onItemsReceived])

  // Handle cancel task
  const handleCancelTask = async () => {
    if (!taskId) return

    try {
      setCancelling(true)

      const result = await authenticatedFetch(`/api/workforce/tasks/${taskId}`, {
        method: 'DELETE'
      })

      if (result.success) {
        console.log('✅ Task cancelled successfully')
        onCancel?.()
      } else {
        setError(result.error || 'Failed to cancel task')
      }
    } catch (err) {
      console.error('Error cancelling task:', err)
      setError('Failed to cancel task')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700">Loading task...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={onCancel}
            className="text-sm text-red-600 hover:text-red-700 underline"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!task) return null

  // Status badge colors
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    accepted: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    terminated: 'bg-red-100 text-red-800 border-red-200'
  }

  const statusLabels = {
    pending: 'Waiting for Workforce',
    accepted: 'Accepted',
    in_progress: 'Scanning in Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    terminated: 'Terminated'
  }

  const itemsCount = task.scanned_items?.length || 0

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
      <div className="space-y-3">
        {/* Header with status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              {task.status === 'in_progress' && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Workforce Task
              </h3>
              <p className="text-xs text-gray-600">
                Customer: {task.customer_name}
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 text-xs font-medium rounded-full border ${
              statusColors[task.status] || statusColors.pending
            }`}
          >
            {statusLabels[task.status] || task.status}
          </span>
        </div>

        {/* Assignee info (if accepted) */}
        {task.assignee && (
          <div className="flex items-center space-x-2 text-sm">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-gray-700">
              Scanning by: <span className="font-medium">
                {task.assignee.first_name && task.assignee.last_name
                  ? `${task.assignee.first_name} ${task.assignee.last_name}`
                  : task.assignee.first_name || 'Workforce User'}
              </span>
            </span>
          </div>
        )}

        {/* Items count */}
        <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              Items Scanned:
            </span>
          </div>
          <span className="text-lg font-bold text-blue-600">{itemsCount}</span>
        </div>

        {/* Recent scanned items preview */}
        {itemsCount > 0 && (
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <h4 className="text-xs font-medium text-gray-600 mb-2">
              Recently Scanned:
            </h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {task.scanned_items.slice(-3).reverse().map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 rounded"
                >
                  <span className="text-gray-700 truncate flex-1">
                    {item.item_name}
                  </span>
                  <span className="text-gray-500 ml-2">
                    Qty: {item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-blue-100">
          {task.status === 'pending' && (
            <span className="text-xs text-gray-600 italic">
              Waiting for workforce user to accept...
            </span>
          )}

          {['accepted', 'in_progress'].includes(task.status) && (
            <span className="text-xs text-gray-600 italic">
              Scanning in progress...
            </span>
          )}

          {task.status === 'completed' && (
            <span className="text-xs text-green-600 font-medium">
              ✓ Task completed successfully!
            </span>
          )}

          {/* Cancel button (only for pending/accepted/in_progress) */}
          {['pending', 'accepted', 'in_progress'].includes(task.status) && (
            <button
              onClick={handleCancelTask}
              disabled={cancelling}
              className="text-xs text-red-600 hover:text-red-700 font-medium underline disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Task'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkforceTaskMonitor
