// src/components/dashboard/RecentActivity.js
import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/utils/supabase'

const RecentActivity = ({ companyId }) => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!companyId) return

      try {
        setLoading(true)
        
        // Fetch recent sales documents
        const { data: salesDocs, error: salesError } = await supabase
          .from('sales_documents')
          .select('id, document_type, document_number, customer_name, total_amount, status, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5)

        // Fetch recent purchase documents
        const { data: purchaseDocs, error: purchaseError } = await supabase
          .from('purchase_documents')
          .select('id, document_type, document_number, vendor_name, total_amount, status, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5)

        // Fetch recent payments
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('id, payment_type, payment_number, party_name, amount, status, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (salesError || purchaseError || paymentsError) {
          throw new Error('Failed to fetch recent activity')
        }

        // Combine and sort all activities
        const allActivities = [
          ...(salesDocs || []).map(doc => ({
            id: `sales-${doc.id}`,
            type: 'sales',
            title: `${doc.document_type} ${doc.document_number}`,
            description: `${doc.customer_name} - ₹${doc.total_amount?.toLocaleString('en-IN')}`,
            status: doc.status,
            time: doc.created_at,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )
          })),
          ...(purchaseDocs || []).map(doc => ({
            id: `purchase-${doc.id}`,
            type: 'purchase',
            title: `${doc.document_type} ${doc.document_number}`,
            description: `${doc.vendor_name} - ₹${doc.total_amount?.toLocaleString('en-IN')}`,
            status: doc.status,
            time: doc.created_at,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            )
          })),
          ...(payments || []).map(payment => ({
            id: `payment-${payment.id}`,
            type: 'payment',
            title: `${payment.payment_type} ${payment.payment_number}`,
            description: `${payment.party_name} - ₹${payment.amount?.toLocaleString('en-IN')}`,
            status: payment.status,
            time: payment.created_at,
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            )
          }))
        ]

        // Sort by time and take latest 10
        const sortedActivities = allActivities
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 10)

        setActivities(sortedActivities)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentActivity()
  }, [companyId])

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      paid: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
      completed: 'bg-green-100 text-green-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getTypeColor = (type) => {
    const colors = {
      sales: 'bg-blue-100 text-blue-600',
      purchase: 'bg-purple-100 text-purple-600',
      payment: 'bg-green-100 text-green-600'
    }
    return colors[type] || 'bg-gray-100 text-gray-600'
  }

  const formatTime = (timeString) => {
    const time = new Date(timeString)
    const now = new Date()
    const diffInHours = Math.floor((now - time) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return time.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-slate-500">No recent activity</p>
          <p className="text-sm text-slate-400">Start by creating your first invoice or recording a sale</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
              <div className={`p-2 rounded-lg ${getTypeColor(activity.type)}`}>
                {activity.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-slate-900 truncate">
                    {activity.title}
                  </p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                    {activity.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 truncate">
                  {activity.description}
                </p>
              </div>
              
              <div className="text-xs text-slate-400">
                {formatTime(activity.time)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecentActivity
