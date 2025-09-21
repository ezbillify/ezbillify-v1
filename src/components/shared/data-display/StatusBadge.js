// src/components/shared/data-display/StatusBadge.js
import React from 'react'

const StatusBadge = ({ 
  status, 
  size = 'md',
  variant = 'default',
  showIcon = true,
  className = '',
  onClick
}) => {
  const statusConfig = {
    // Invoice/Document Statuses
    draft: { 
      variant: 'default', 
      label: 'Draft',
      icon: '📝',
      color: 'bg-slate-500 text-white shadow-lg shadow-slate-500/25'
    },
    sent: { 
      variant: 'primary', 
      label: 'Sent',
      icon: '📤',
      color: 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
    },
    paid: { 
      variant: 'success', 
      label: 'Paid',
      icon: '✅',
      color: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
    },
    unpaid: { 
      variant: 'danger', 
      label: 'Unpaid',
      icon: '⏳',
      color: 'bg-red-500 text-white shadow-lg shadow-red-500/25'
    },
    pending: { 
      variant: 'warning', 
      label: 'Pending',
      icon: '⏸️',
      color: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
    },
    overdue: { 
      variant: 'danger', 
      label: 'Overdue',
      icon: '⚠️',
      color: 'bg-red-600 text-white shadow-lg shadow-red-600/25'
    },
    cancelled: { 
      variant: 'default', 
      label: 'Cancelled',
      icon: '❌',
      color: 'bg-gray-500 text-white shadow-lg shadow-gray-500/25'
    },
    
    // Payment Statuses
    completed: { 
      variant: 'success', 
      label: 'Completed',
      icon: '✅',
      color: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
    },
    failed: { 
      variant: 'danger', 
      label: 'Failed',
      icon: '❌',
      color: 'bg-red-500 text-white shadow-lg shadow-red-500/25'
    },
    processing: { 
      variant: 'warning', 
      label: 'Processing',
      icon: '⏳',
      color: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
    },
    refunded: { 
      variant: 'info', 
      label: 'Refunded',
      icon: '↩️',
      color: 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
    },
    
    // General Statuses
    active: { 
      variant: 'success', 
      label: 'Active',
      icon: '🟢',
      color: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
    },
    inactive: { 
      variant: 'default', 
      label: 'Inactive',
      icon: '⚫',
      color: 'bg-slate-400 text-white shadow-lg shadow-slate-400/25'
    },
    approved: { 
      variant: 'success', 
      label: 'Approved',
      icon: '✅',
      color: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
    },
    rejected: { 
      variant: 'danger', 
      label: 'Rejected',
      icon: '❌',
      color: 'bg-red-500 text-white shadow-lg shadow-red-500/25'
    },
    
    // Customer Types
    b2b: { 
      variant: 'primary', 
      label: 'B2B',
      icon: '🏢',
      color: 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
    },
    b2c: { 
      variant: 'success', 
      label: 'B2C',
      icon: '👤',
      color: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
    },
    
    // Priority Levels
    low: { 
      variant: 'success', 
      label: 'Low',
      icon: '🔽',
      color: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
    },
    medium: { 
      variant: 'warning', 
      label: 'Medium',
      icon: '🔸',
      color: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
    },
    high: { 
      variant: 'danger', 
      label: 'High',
      icon: '🔺',
      color: 'bg-red-500 text-white shadow-lg shadow-red-500/25'
    },
    urgent: { 
      variant: 'danger', 
      label: 'Urgent',
      icon: '🔥',
      color: 'bg-red-600 text-white shadow-lg shadow-red-600/25'
    }
  }

  const sizes = {
    xs: 'px-2 py-0.5 text-xs min-h-[20px]',
    sm: 'px-2.5 py-1 text-xs min-h-[24px]',
    md: 'px-3 py-1.5 text-sm min-h-[28px]',
    lg: 'px-4 py-2 text-sm min-h-[32px]',
    xl: 'px-5 py-2.5 text-base min-h-[36px]'
  }

  const config = statusConfig[status] || {
    variant: 'default',
    label: status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown',
    icon: '❓',
    color: 'bg-slate-400 text-white shadow-lg shadow-slate-400/25'
  }

  const baseClasses = 'inline-flex items-center font-semibold rounded-full transition-all duration-200 border-0'
  const sizeClasses = sizes[size]
  const colorClasses = config.color
  const clickableClasses = onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''

  const classes = `${baseClasses} ${sizeClasses} ${colorClasses} ${clickableClasses} ${className}`

  const BadgeContent = () => (
    <>
      {showIcon && config.icon && (
        <span className="mr-1.5 text-sm leading-none">
          {config.icon}
        </span>
      )}
      <span className="leading-none font-medium">
        {config.label}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
      >
        <BadgeContent />
      </button>
    )
  }

  return (
    <span className={classes}>
      <BadgeContent />
    </span>
  )
}

// Specialized Status Badge Components
export const InvoiceStatusBadge = ({ status, size = 'md', onClick }) => {
  const invoiceStatuses = ['draft', 'sent', 'paid', 'unpaid', 'overdue', 'cancelled']
  
  if (!invoiceStatuses.includes(status)) {
    console.warn(`Invalid invoice status: ${status}`)
  }

  return (
    <StatusBadge 
      status={status} 
      size={size} 
      onClick={onClick}
      showIcon={true}
    />
  )
}

export const PaymentStatusBadge = ({ status, size = 'md', onClick }) => {
  const paymentStatuses = ['paid', 'unpaid', 'pending', 'completed', 'failed', 'processing', 'refunded']
  
  if (!paymentStatuses.includes(status)) {
    console.warn(`Invalid payment status: ${status}`)
  }

  return (
    <StatusBadge 
      status={status} 
      size={size} 
      onClick={onClick}
      showIcon={true}
    />
  )
}

export const CustomerTypeBadge = ({ type, size = 'sm', onClick }) => {
  return (
    <StatusBadge 
      status={type} 
      size={size} 
      onClick={onClick}
      showIcon={true}
    />
  )
}

export const PriorityBadge = ({ priority, size = 'sm', onClick }) => {
  const priorities = ['low', 'medium', 'high', 'urgent']
  
  if (!priorities.includes(priority)) {
    console.warn(`Invalid priority: ${priority}`)
  }

  return (
    <StatusBadge 
      status={priority} 
      size={size} 
      onClick={onClick}
      showIcon={true}
    />
  )
}

export const GeneralStatusBadge = ({ status, size = 'md', onClick }) => {
  const generalStatuses = ['active', 'inactive', 'approved', 'rejected', 'pending']
  
  return (
    <StatusBadge 
      status={status} 
      size={size} 
      onClick={onClick}
      showIcon={true}
    />
  )
}

// Animated Status Badge for real-time updates
export const AnimatedStatusBadge = ({ status, size = 'md', animate = true, onClick }) => {
  const animationClasses = animate ? 'animate-pulse' : ''
  
  if (['processing', 'pending', 'loading'].includes(status)) {
    return (
      <StatusBadge 
        status={status} 
        size={size} 
        onClick={onClick}
        showIcon={true}
        className={animationClasses}
      />
    )
  }

  return (
    <StatusBadge 
      status={status} 
      size={size} 
      onClick={onClick}
      showIcon={true}
    />
  )
}

export default StatusBadge
