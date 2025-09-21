// src/components/shared/forms/ValidationMessage.js
import React from 'react'

const ValidationMessage = ({ 
  errors = [], 
  type = 'error',
  className = '',
  title,
  dismissible = false,
  onDismiss
}) => {
  if (!errors || errors.length === 0) return null

  const variants = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800'
  }

  const icons = {
    error: (
      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )
  }

  const errorList = Array.isArray(errors) ? errors : [errors]
  const filteredErrors = errorList.filter(error => error && error.toString().trim())

  if (filteredErrors.length === 0) return null

  const defaultTitles = {
    error: 'Validation Error',
    warning: 'Warning',
    info: 'Information',
    success: 'Success'
  }

  return (
    <div className={`rounded-xl border-2 p-4 relative ${variants[type]} ${className}`}>
      <div className="flex">
        {/* Icon */}
        <div className="flex-shrink-0">
          {icons[type]}
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          {/* Title */}
          {(title || filteredErrors.length > 1) && (
            <h4 className="text-sm font-semibold mb-2">
              {title || defaultTitles[type]}
            </h4>
          )}

          {/* Messages */}
          {filteredErrors.length === 1 ? (
            <p className="text-sm font-medium leading-relaxed">
              {filteredErrors[0]}
            </p>
          ) : (
            <div>
              <p className="text-sm font-medium mb-2">
                Please fix the following issues:
              </p>
              <ul className="text-sm space-y-1">
                {filteredErrors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 bg-current rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <span className="leading-relaxed">{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && onDismiss && (
          <div className="flex-shrink-0 ml-4">
            <button
              type="button"
              className="inline-flex rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors hover:bg-black/10"
              onClick={onDismiss}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/20 to-transparent rounded-xl pointer-events-none" />
    </div>
  )
}

// Specialized Validation Components
export const FormValidationSummary = ({ formErrors, className = '' }) => {
  const errors = Object.values(formErrors).filter(error => error)
  
  if (errors.length === 0) return null

  return (
    <ValidationMessage
      errors={errors}
      type="error"
      title="Please correct the following errors:"
      className={`mb-6 ${className}`}
    />
  )
}

export const FieldValidationMessage = ({ error, type = 'error', className = '' }) => {
  if (!error) return null

  return (
    <div className={`mt-1 flex items-start ${className}`}>
      <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <p className="text-sm text-red-600 font-medium">{error}</p>
    </div>
  )
}

export const SuccessMessage = ({ message, dismissible = true, onDismiss, className = '' }) => {
  return (
    <ValidationMessage
      errors={[message]}
      type="success"
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={className}
    />
  )
}

export default ValidationMessage