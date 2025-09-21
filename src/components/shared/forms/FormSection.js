// src/components/shared/forms/FormSection.js
import React, { useState } from 'react'

const FormSection = ({ 
  title, 
  description, 
  children, 
  collapsible = false,
  defaultExpanded = true,
  className = '',
  icon,
  actions
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className={`form-section bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>
      <div 
        className={`
          px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50
          ${collapsible ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}
        `}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                {icon}
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              {description && (
                <p className="text-sm text-slate-600 mt-1">{description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {actions && !collapsible && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
            
            {collapsible && (
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
      </div>
      
      {(!collapsible || isExpanded) && (
        <div className="p-6">
          {children}
        </div>
      )}
      
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-50 to-transparent rounded-xl pointer-events-none opacity-50" />
    </div>
  )
}

export default FormSection
