// src/components/shared/data-display/PercentageDisplay.js
export const PercentageDisplay = ({ 
    value, 
    precision = 1,
    size = 'md',
    variant = 'default',
    showPositiveSign = false,
    className = ''
  }) => {
    const sizes = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base', 
      lg: 'text-lg',
      xl: 'text-xl'
    }
  
    const variants = {
      default: 'text-slate-900',
      muted: 'text-slate-600',
      success: 'text-emerald-600',
      danger: 'text-red-600',
      warning: 'text-amber-600'
    }
  
    const formatPercentage = (val) => {
      if (val === null || val === undefined || isNaN(val)) return '0'
      
      const numValue = parseFloat(val)
      const formatted = numValue.toFixed(precision)
      
      if (showPositiveSign && numValue > 0) {
        return `+${formatted}`
      }
      
      return formatted
    }
  
    return (
      <span className={`font-medium ${sizes[size]} ${variants[variant]} ${className}`}>
        {formatPercentage(value)}%
      </span>
    )
  }