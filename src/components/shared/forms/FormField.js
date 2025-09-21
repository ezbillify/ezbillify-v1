// src/components/shared/forms/FormField.js
import React from 'react'

const FormField = ({ 
  children, 
  label, 
  required = false,
  error,
  helperText,
  className = '',
  layout = 'vertical'
}) => {
  const layoutClasses = {
    vertical: 'flex flex-col space-y-2',
    horizontal: 'flex items-center space-x-4',
    inline: 'flex items-center space-x-2'
  }

  return (
    <div className={`form-field ${layoutClasses[layout]} ${className}`}>
      {label && (
        <label className={`
          text-sm font-semibold text-slate-700
          ${layout === 'horizontal' ? 'w-1/4 flex-shrink-0' : ''}
          ${layout === 'inline' ? 'flex-shrink-0' : ''}
        `}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={`
        ${layout === 'horizontal' ? 'flex-1' : ''}
        ${layout === 'inline' ? 'flex-1' : ''}
      `}>
        {children}
        
        {helperText && !error && (
          <p className="mt-1 text-sm text-slate-500">{helperText}</p>
        )}
        
        {error && (
          <div className="mt-1 flex items-start">
            <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FormField