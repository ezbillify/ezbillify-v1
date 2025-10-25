// src/components/dashboard/QuickActions.js
import React, { memo } from 'react'
import { useRouter } from 'next/router'

const QuickActions = () => {
  const router = useRouter()

  const quickActions = [
    {
      title: 'Create Invoice',
      description: 'Generate new sales invoice',
      href: '/sales/invoices/new',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'blue'
    },
    {
      title: 'Add Customer',
      description: 'Register new customer',
      href: '/sales/customers/new',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'emerald'
    },
    {
      title: 'Record Purchase',
      description: 'Add purchase bill',
      href: '/purchase/bills/new',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: 'purple'
    },
    {
      title: 'Add Item',
      description: 'Create new product/service',
      href: '/items/items/new',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'orange'
    },
    {
      title: 'Create Quotation',
      description: 'Generate price quote',
      href: '/sales/quotations/new',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      color: 'teal'
    },
    {
      title: 'Record Payment',
      description: 'Log payment received',
      href: '/sales/payments/new',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'green'
    }
  ]

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-500 hover:bg-blue-600',
      emerald: 'bg-emerald-500 hover:bg-emerald-600',
      purple: 'bg-purple-500 hover:bg-purple-600',
      orange: 'bg-orange-500 hover:bg-orange-600',
      teal: 'bg-teal-500 hover:bg-teal-600',
      green: 'bg-green-500 hover:bg-green-600'
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
      
      <div className="grid grid-cols-1 gap-3">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => router.push(action.href)}
            className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
          >
            <div className={`
              p-2 rounded-lg text-white transition-colors
              ${getColorClasses(action.color)}
            `}>
              {action.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-slate-900 group-hover:text-slate-700">
                {action.title}
              </h4>
              <p className="text-sm text-slate-500">
                {action.description}
              </p>
            </div>
            <svg 
              className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200">
        <button
          onClick={() => router.push('/sales')}
          className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
        >
          View All Modules
        </button>
      </div>
    </div>
  )
}

export default memo(QuickActions)
