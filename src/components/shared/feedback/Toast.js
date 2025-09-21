// src/components/shared/feedback/Toast.js
import React, { useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'

const Toast = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const { id, message, type, duration, title, action } = toast

  useEffect(() => {
    // Slide in animation
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(() => onRemove(id), 300)
  }

  const variants = {
    success: {
      icon: (
        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-white border-l-4 border-l-emerald-500 shadow-lg shadow-emerald-100',
      progressBar: 'bg-emerald-500'
    },
    error: {
      icon: (
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-white border-l-4 border-l-red-500 shadow-lg shadow-red-100',
      progressBar: 'bg-red-500'
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      bg: 'bg-white border-l-4 border-l-amber-500 shadow-lg shadow-amber-100',
      progressBar: 'bg-amber-500'
    },
    info: {
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-white border-l-4 border-l-blue-500 shadow-lg shadow-blue-100',
      progressBar: 'bg-blue-500'
    }
  }

  const variant = variants[type] || variants.info

  return (
    <div
      className={`
        relative max-w-sm w-full pointer-events-auto overflow-hidden rounded-xl backdrop-blur-md
        transition-all duration-300 ease-out transform
        ${variant.bg}
        ${isVisible && !isRemoving 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      {/* Progress Bar */}
      {duration > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200">
          <div 
            className={`h-full ${variant.progressBar} transition-all ease-linear`}
            style={{
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 pt-0.5">
            {variant.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                {title}
              </h4>
            )}
            <p className="text-sm text-slate-700 leading-relaxed">
              {message}
            </p>

            {/* Action Button */}
            {action && (
              <div className="mt-3">
                <button
                  type="button"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors"
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex-shrink-0">
            <button
              type="button"
              className="inline-flex text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1.5 transition-colors"
              onClick={handleRemove}
            >
              <span className="sr-only">Close</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-slate-50 to-transparent rounded-xl pointer-events-none opacity-50" />
    </div>
  )
}

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-0 right-0 z-50 p-6 space-y-4 max-w-md w-full">
      {toasts.map((toast) => (
        <Toast 
          key={toast.id} 
          toast={toast} 
          onRemove={removeToast}
        />
      ))}
    </div>
  )
}

// Specialized Toast Components
export const InvoiceToast = ({ invoice, type = 'success' }) => {
  const { showSuccess, showError, showInfo } = useToast()

  const messages = {
    created: `Invoice ${invoice.document_number} created successfully`,
    updated: `Invoice ${invoice.document_number} updated`,
    sent: `Invoice ${invoice.document_number} sent to ${invoice.customer_name}`,
    paid: `Payment received for Invoice ${invoice.document_number}`,
    cancelled: `Invoice ${invoice.document_number} cancelled`,
    error: `Failed to process Invoice ${invoice.document_number}`
  }

  const showToast = (messageType) => {
    const message = messages[messageType]
    const action = {
      label: 'View Invoice',
      onClick: () => {
        // Navigate to invoice view
        window.location.href = `/sales/invoices/${invoice.id}`
      }
    }

    switch (type) {
      case 'success':
        showSuccess(message, 5000, { action, title: 'Invoice Updated' })
        break
      case 'error':
        showError(message, 7000, { title: 'Invoice Error' })
        break
      default:
        showInfo(message, 5000, { action })
    }
  }

  return { showToast }
}

export const PaymentToast = ({ payment, type = 'success' }) => {
  const { showSuccess, showError, showWarning } = useToast()

  const showToast = (messageType) => {
    const messages = {
      received: `Payment of ₹${payment.amount} received from ${payment.customer_name}`,
      failed: `Payment of ₹${payment.amount} failed for ${payment.customer_name}`,
      pending: `Payment of ₹${payment.amount} is pending verification`
    }

    const message = messages[messageType]
    const action = {
      label: 'View Payment',
      onClick: () => {
        window.location.href = `/sales/payments/${payment.id}`
      }
    }

    switch (type) {
      case 'success':
        showSuccess(message, 6000, { action, title: 'Payment Successful' })
        break
      case 'error':
        showError(message, 8000, { title: 'Payment Failed' })
        break
      case 'warning':
        showWarning(message, 7000, { action, title: 'Payment Pending' })
        break
    }
  }

  return { showToast }
}

// CSS for progress bar animation
const styles = `
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
}

export default Toast
