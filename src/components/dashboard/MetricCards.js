// src/components/dashboard/MetricCards.js
import React, { memo } from 'react'

const MetricCards = ({ stats, loading, error }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-red-500 mt-1">Failed to load dashboard metrics</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="text-sm text-red-700 hover:text-red-900 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  const metrics = [
    {
      title: 'Monthly Sales',
      value: formatCurrency(stats?.monthly_sales || 0),
      change: '+12.5%',
      changeType: 'positive',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'blue'
    },
    {
      title: 'Monthly Purchases',
      value: formatCurrency(stats?.monthly_purchases || 0),
      change: '+8.2%',
      changeType: 'positive',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: 'emerald'
    },
    {
      title: 'Gross Profit',
      value: formatCurrency(stats?.net_profit || 0),
      change: stats?.net_profit >= 0 ? '+15.8%' : '-5.2%',
      changeType: stats?.net_profit >= 0 ? 'positive' : 'negative',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: stats?.net_profit >= 0 ? 'green' : 'red'
    },
    {
      title: 'Outstanding Receivables',
      value: formatCurrency(stats?.outstanding_receivables || 0),
      change: stats?.outstanding_receivables > 0 ? 'Pending' : 'Clear',
      changeType: stats?.outstanding_receivables > 0 ? 'negative' : 'positive',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'purple'
    }
  ]

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-500',
        text: 'text-blue-600',
        iconBg: 'bg-blue-100'
      },
      emerald: {
        bg: 'bg-emerald-500',
        text: 'text-emerald-600',
        iconBg: 'bg-emerald-100'
      },
      green: {
        bg: 'bg-green-500',
        text: 'text-green-600',
        iconBg: 'bg-green-100'
      },
      red: {
        bg: 'bg-red-500',
        text: 'text-red-600',
        iconBg: 'bg-red-100'
      },
      purple: {
        bg: 'bg-purple-500',
        text: 'text-purple-600',
        iconBg: 'bg-purple-100'
      }
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const colorClasses = getColorClasses(metric.color)
        
        return (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${colorClasses.iconBg}`}>
                <span className={colorClasses.text}>
                  {metric.icon}
                </span>
              </div>
              <div className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${metric.changeType === 'positive' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
                }
              `}>
                {metric.change}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-1">
                {metric.title}
              </h3>
              <p className="text-2xl font-bold text-slate-900">
                {metric.value}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default memo(MetricCards)
