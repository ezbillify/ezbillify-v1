// src/components/shared/ui/Badge.js
import React from 'react'

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  icon,
  iconPosition = 'left',
  className = '',
  onClick,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center font-semibold rounded-full transition-all duration-200'
  
  const variants = {
    default: 'bg-slate-100 text-slate-800 border border-slate-200',
    primary: 'bg-blue-100 text-blue-800 border border-blue-200',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    danger: 'bg-red-100 text-red-800 border border-red-200',
    info: 'bg-sky-100 text-sky-800 border border-sky-200',
    
    // Status variants for billing
    paid: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25',
    unpaid: 'bg-red-500 text-white shadow-lg shadow-red-500/25',
    pending: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25',
    draft: 'bg-slate-500 text-white shadow-lg shadow-slate-500/25',
    sent: 'bg-blue-500 text-white shadow-lg shadow-blue-500/25',
    overdue: 'bg-red-600 text-white shadow-lg shadow-red-600/25',
    cancelled: 'bg-gray-500 text-white shadow-lg shadow-gray-500/25',
    
    // Special variants
    glass: 'bg-white/20 backdrop-blur-md border border-white/30 text-slate-700',
    gradient: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg'
  }
  
  const sizes = {
    xs: 'px-2 py-0.5 text-xs min-h-[20px]',
    sm: 'px-2.5 py-1 text-xs min-h-[24px]',
    md: 'px-3 py-1.5 text-sm min-h-[28px]',
    lg: 'px-4 py-2 text-sm min-h-[32px]',
    xl: 'px-5 py-2.5 text-base min-h-[36px]'
  }
  
  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5'
  }
  
  const clickableClasses = onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
  
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${clickableClasses} ${className}`
  
  const renderIcon = (position) => {
    if (!icon || iconPosition !== position) return null
    
    return (
      <span className={`
        flex items-center ${iconSizes[size]}
        ${position === 'left' ? 'mr-1.5' : 'ml-1.5'}
      `}>
        {icon}
      </span>
    )
  }

  const BadgeContent = () => (
    <>
      {renderIcon('left')}
      <span className="leading-none">{children}</span>
      {renderIcon('right')}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        {...props}
      >
        <BadgeContent />
      </button>
    )
  }

  return (
    <span className={classes} {...props}>
      <BadgeContent />
    </span>
  )
}

// Specialized Badge Components
export const StatusBadge = ({ status, size = 'md' }) => {
  const statusConfig = {
    paid: { variant: 'paid', icon: '✓' },
    unpaid: { variant: 'unpaid', icon: '⏳' },
    pending: { variant: 'pending', icon: '⏸' },
    draft: { variant: 'draft', icon: '📝' },
    sent: { variant: 'sent', icon: '📤' },
    overdue: { variant: 'overdue', icon: '⚠' },
    cancelled: { variant: 'cancelled', icon: '✕' },
    active: { variant: 'success', icon: '●' },
    inactive: { variant: 'default', icon: '○' },
    approved: { variant: 'success', icon: '✓' },
    rejected: { variant: 'danger', icon: '✕' }
  }

  const config = statusConfig[status?.toLowerCase()] || { variant: 'default', icon: '?' }

  return (
    <Badge 
      variant={config.variant} 
      size={size}
      icon={<span>{config.icon}</span>}
    >
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </Badge>
  )
}

export const CustomerTypeBadge = ({ type, size = 'sm' }) => {
  const types = {
    b2b: { variant: 'primary', label: 'B2B', icon: '🏢' },
    b2c: { variant: 'success', label: 'B2C', icon: '👤' }
  }

  const config = types[type?.toLowerCase()] || { variant: 'default', label: type || 'Unknown', icon: '?' }

  return (
    <Badge 
      variant={config.variant} 
      size={size}
      icon={<span>{config.icon}</span>}
    >
      {config.label}
    </Badge>
  )
}

export const PriorityBadge = ({ priority, size = 'sm' }) => {
  const priorities = {
    low: { variant: 'success', icon: '⬇' },
    medium: { variant: 'warning', icon: '⏸' },
    high: { variant: 'danger', icon: '⬆' },
    urgent: { variant: 'danger', icon: '🔥' }
  }

  const config = priorities[priority?.toLowerCase()] || { variant: 'default', icon: '?' }

  return (
    <Badge 
      variant={config.variant} 
      size={size}
      icon={<span>{config.icon}</span>}
    >
      {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Unknown'}
    </Badge>
  )
}

export const CurrencyBadge = ({ currency = 'INR', amount, size = 'md' }) => {
  const currencySymbols = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£'
  }

  const symbol = currencySymbols[currency] || currency
  const formattedAmount = typeof amount === 'number' 
    ? amount.toLocaleString('en-IN')
    : amount

  return (
    <Badge 
      variant="gradient" 
      size={size}
      className="font-mono"
    >
      {symbol} {formattedAmount}
    </Badge>
  )
}

export const NotificationBadge = ({ count, size = 'xs', max = 99 }) => {
  if (!count || count <= 0) return null

  const displayCount = count > max ? `${max}+` : count.toString()

  return (
    <Badge 
      variant="danger" 
      size={size}
      className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center p-0 text-xs font-bold"
    >
      {displayCount}
    </Badge>
  )
}

export const TaxBadge = ({ taxRate, size = 'sm' }) => {
  if (!taxRate && taxRate !== 0) return null

  return (
    <Badge 
      variant="info" 
      size={size}
      icon={
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      }
    >
      GST {taxRate}%
    </Badge>
  )
}

export const QuantityBadge = ({ quantity, unit = 'PCS', size = 'sm' }) => {
  if (!quantity && quantity !== 0) return null

  return (
    <Badge 
      variant="glass" 
      size={size}
      className="font-mono"
    >
      {quantity} {unit}
    </Badge>
  )
}

// Additional billing-specific badges
export const PaymentMethodBadge = ({ method, size = 'sm' }) => {
  const methods = {
    cash: { variant: 'success', icon: '💵' },
    card: { variant: 'primary', icon: '💳' },
    bank: { variant: 'info', icon: '🏦' },
    upi: { variant: 'warning', icon: '📱' },
    cheque: { variant: 'default', icon: '📄' }
  }

  const config = methods[method?.toLowerCase()] || { variant: 'default', icon: '💰' }

  return (
    <Badge 
      variant={config.variant} 
      size={size}
      icon={<span>{config.icon}</span>}
    >
      {method ? method.toUpperCase() : 'Unknown'}
    </Badge>
  )
}

export const DocumentTypeBadge = ({ type, size = 'sm' }) => {
  const types = {
    invoice: { variant: 'primary', icon: '📄' },
    quote: { variant: 'info', icon: '💭' },
    bill: { variant: 'warning', icon: '🧾' },
    receipt: { variant: 'success', icon: '🧾' },
    order: { variant: 'default', icon: '📦' }
  }

  const config = types[type?.toLowerCase()] || { variant: 'default', icon: '📄' }

  return (
    <Badge 
      variant={config.variant} 
      size={size}
      icon={<span>{config.icon}</span>}
    >
      {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Document'}
    </Badge>
  )
}

export default Badge