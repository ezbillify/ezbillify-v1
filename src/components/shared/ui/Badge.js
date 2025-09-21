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
    inactive: { variant: 'default', icon: '○' }
  }

  const config = statusConfig[status] || { variant: 'default', icon: '?' }

  return (
    <Badge 
      variant={config.variant} 
      size={size}
      icon={<span>{config.icon}</span>}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export const CustomerTypeBadge = ({ type, size = 'sm' }) => {
  const types = {
    b2b: { variant: 'primary', label: 'B2B', icon: '🏢' },
    b2c: { variant: 'success', label: 'B2C', icon: '👤' }
  }

  const config = types[type] || { variant: 'default', label: type, icon: '?' }

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

  const config = priorities[priority] || { variant: 'default', icon: '?' }

  return (
    <Badge 
      variant={config.variant} 
      size={size}
      icon={<span>{config.icon}</span>}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  )
}

export const CurrencyBadge = ({ currency, amount, size = 'md' }) => {
  const currencySymbols = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£'
  }

  const symbol = currencySymbols[currency] || currency

  return (
    <Badge 
      variant="gradient" 
      size={size}
      className="font-mono"
    >
      {symbol} {amount}
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

export const QuantityBadge = ({ quantity, unit, size = 'sm' }) => {
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

export default Badge
