// src/components/shared/ui/Button.js
import React from 'react'

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
  ...props 
}) => {
  const baseClasses = 'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 group'
  
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 border border-blue-600',
    secondary: 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg shadow-slate-500/25 hover:shadow-slate-500/40 hover:from-slate-700 hover:to-slate-800 focus:ring-slate-500 border border-slate-600',
    success: 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-700 hover:to-emerald-800 focus:ring-emerald-500 border border-emerald-600',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:from-red-700 hover:to-red-800 focus:ring-red-500 border border-red-600',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:from-amber-600 hover:to-amber-700 focus:ring-amber-500 border border-amber-500',
    outline: 'bg-white/90 backdrop-blur-sm border-2 border-blue-200 text-blue-700 shadow-lg shadow-blue-100/50 hover:bg-blue-50 hover:border-blue-300 hover:shadow-blue-200/50 focus:ring-blue-500',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-800 focus:ring-slate-400 border border-transparent hover:border-slate-200',
    glass: 'bg-white/20 backdrop-blur-md border border-white/30 text-slate-700 shadow-lg shadow-black/10 hover:bg-white/30 hover:shadow-black/20 focus:ring-blue-400'
  }
  
  const sizes = {
    xs: 'px-3 py-1.5 text-xs min-h-[32px]',
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-sm min-h-[44px]',
    lg: 'px-8 py-4 text-base min-h-[52px]',
    xl: 'px-10 py-5 text-lg min-h-[60px]'
  }
  
  const widthClass = fullWidth ? 'w-full' : ''
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`
  
  const renderIcon = (position) => {
    if (!icon || iconPosition !== position) return null
    
    return (
      <span className={`flex items-center ${
        position === 'left' ? 'mr-2' : 'ml-2'
      } ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
        {icon}
      </span>
    )
  }
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent"></div>
      </div>
      
      {/* Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      
      {/* Content */}
      <span className={`flex items-center relative z-10 ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
        {renderIcon('left')}
        {children}
        {renderIcon('right')}
      </span>
    </button>
  )
}

export default Button
