// src/components/shared/data-display/CurrencyDisplay.js
import React from 'react'

const CurrencyDisplay = ({ 
  amount, 
  currency = 'INR',
  showSymbol = true,
  showCode = false,
  precision = 2,
  size = 'md',
  variant = 'default',
  className = ''
}) => {
  const currencySymbols = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥'
  }

  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm', 
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl'
  }

  const variants = {
    default: 'text-slate-900',
    muted: 'text-slate-600',
    success: 'text-emerald-600',
    danger: 'text-red-600',
    warning: 'text-amber-600',
    primary: 'text-blue-600'
  }

  const formatAmount = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0.00'
    
    const numValue = parseFloat(value)
    return numValue.toLocaleString('en-IN', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    })
  }

  const symbol = showSymbol ? currencySymbols[currency] || currency : ''
  const code = showCode ? ` ${currency}` : ''

  return (
    <span className={`font-mono ${sizes[size]} ${variants[variant]} ${className}`}>
      {symbol}{formatAmount(amount)}{code}
    </span>
  )
}

export default CurrencyDisplay