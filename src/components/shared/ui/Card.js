// src/components/shared/ui/Card.js
import React from 'react'

const Card = ({ 
  children, 
  variant = 'default',
  padding = 'md',
  shadow = 'md',
  hover = false,
  className = '',
  header,
  footer,
  ...props 
}) => {
  const variants = {
    default: 'bg-white/95 backdrop-blur-sm border border-slate-200/80',
    glass: 'bg-white/20 backdrop-blur-md border border-white/30 shadow-lg shadow-black/5',
    gradient: 'bg-gradient-to-br from-white via-blue-50/50 to-slate-100/50 border border-blue-200/30',
    success: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200',
    warning: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200',
    danger: 'bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200',
    dark: 'bg-slate-800 border border-slate-700 text-white'
  }
  
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }
  
  const shadows = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-lg shadow-slate-200/50',
    lg: 'shadow-xl shadow-slate-300/30',
    xl: 'shadow-2xl shadow-slate-400/20'
  }
  
  const hoverEffects = hover ? 'hover:shadow-xl hover:shadow-slate-300/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer' : ''
  
  const cardClasses = `
    rounded-2xl transition-all duration-200
    ${variants[variant]}
    ${shadows[shadow]}
    ${hoverEffects}
    ${className}
  `.replace(/\s+/g, ' ').trim()
  
  return (
    <div className={cardClasses} {...props}>
      {/* Header */}
      {header && (
        <div className="border-b border-slate-200/60 pb-4 mb-6">
          {header}
        </div>
      )}
      
      {/* Content */}
      <div className={paddings[padding]}>
        {children}
      </div>
      
      {/* Footer */}
      {footer && (
        <div className="border-t border-slate-200/60 pt-4 mt-6">
          {footer}
        </div>
      )}
      
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-2xl pointer-events-none"></div>
    </div>
  )
}

// Specialized Card Components
export const StatsCard = ({ title, value, change, icon, trend = 'up' }) => {
  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    neutral: 'text-slate-600'
  }
  
  const trendIcons = {
    up: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
      </svg>
    )
  }
  
  return (
    <Card variant="gradient" hover padding="md" className="relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm font-medium ${trendColors[trend]}`}>
              {trendIcons[trend]}
              <span className="ml-1">{change}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-blue-500/10 rounded-xl">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

export const InvoiceCard = ({ invoice, onClick }) => {
  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700'
  }
  
  return (
    <Card 
      hover 
      padding="md" 
      className="cursor-pointer border-l-4 border-l-blue-500"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-900">{invoice.document_number}</h3>
          <p className="text-sm text-slate-600">{invoice.customer_name}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[invoice.status]}`}>
          {invoice.status.toUpperCase()}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">₹{invoice.total_amount}</p>
          <p className="text-sm text-slate-500">{invoice.document_date}</p>
        </div>
        
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Card>
  )
}

export const CustomerCard = ({ customer, onClick }) => {
  return (
    <Card hover padding="md" onClick={onClick} className="cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold mr-3">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{customer.name}</h3>
              <p className="text-sm text-slate-600">{customer.customer_code}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Email</p>
              <p className="font-medium text-slate-700">{customer.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500">Phone</p>
              <p className="font-medium text-slate-700">{customer.phone || 'N/A'}</p>
            </div>
            {customer.gstin && (
              <div className="col-span-2">
                <p className="text-slate-500">GSTIN</p>
                <p className="font-medium text-slate-700">{customer.gstin}</p>
              </div>
            )}
          </div>
        </div>
        
        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
          customer.customer_type === 'b2b' 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {customer.customer_type.toUpperCase()}
        </span>
      </div>
    </Card>
  )
}

export default Card
