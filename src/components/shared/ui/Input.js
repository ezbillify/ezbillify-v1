// src/components/shared/ui/Input.js
import React, { forwardRef } from 'react'

const Input = forwardRef(({ 
  label, 
  error, 
  required = false, 
  icon,
  iconPosition = 'left',
  type = 'text',
  className = '',
  helperText,
  currency = false,
  currencySymbol = '₹',
  ...props 
}, ref) => {
  const hasError = !!error
  const hasIcon = !!icon
  
  const baseInputClasses = `
    w-full px-4 py-3 text-slate-900 placeholder-slate-400 
    bg-white/90 backdrop-blur-sm border-2 rounded-xl
    transition-all duration-300 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-1
    ${hasError 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 hover:border-slate-300'
    }
    ${hasIcon && iconPosition === 'left' ? 'pl-12' : ''}
    ${hasIcon && iconPosition === 'right' ? 'pr-12' : ''}
    ${currency ? 'text-right font-mono' : ''}
  `.replace(/\s+/g, ' ').trim()

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label} 
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Input Container */}
      <div className="relative group">
        {/* Currency Symbol */}
        {currency && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-mono text-sm z-10">
            {currencySymbol}
          </div>
        )}
        
        {/* Icon */}
        {icon && (
          <div className={`
            absolute top-1/2 transform -translate-y-1/2 z-10
            ${iconPosition === 'left' ? 'left-4' : 'right-4'}
            ${hasError ? 'text-red-400' : 'text-slate-400 group-focus-within:text-blue-500'}
            transition-colors duration-200
          `}>
            {icon}
          </div>
        )}
        
        {/* Input Field */}
        <input
          ref={ref}
          type={type}
          className={`${baseInputClasses} ${currency ? 'pl-8' : ''}`}
          {...props}
        />
        
        {/* Floating Border Effect */}
        <div className={`
          absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 
          transition-opacity duration-300 pointer-events-none
          ${hasError 
            ? 'shadow-lg shadow-red-100' 
            : 'shadow-lg shadow-blue-100'
          }
        `}></div>
      </div>
      
      {/* Helper Text or Error */}
      {(helperText || error) && (
        <div className="mt-2 flex items-start">
          {error ? (
            <>
              <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500 ml-1">{helperText}</p>
          )}
        </div>
      )}
    </div>
  )
})

Input.displayName = 'Input'

// Specialized variations
export const CurrencyInput = (props) => (
  <Input {...props} currency={true} type="number" step="0.01" min="0" />
)

export const GSTInput = (props) => (
  <Input 
    {...props} 
    placeholder="22AAAAA0000A1Z5"
    maxLength={15}
    className="uppercase"
    icon={
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    }
  />
)

export const EmailInput = (props) => (
  <Input 
    {...props} 
    type="email"
    icon={
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
      </svg>
    }
  />
)

export const PhoneInput = (props) => (
  <Input 
    {...props} 
    type="tel"
    placeholder="+91 98765 43210"
    icon={
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    }
  />
)

export const SearchInput = ({ onSearch, ...props }) => (
  <Input 
    {...props} 
    type="search"
    icon={
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    }
    iconPosition="left"
    onKeyDown={(e) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch(e.target.value)
      }
    }}
  />
)

export default Input
