// src/context/ToastContext.js
import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext({})

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  // Generate unique ID for toasts
  const generateId = () => Math.random().toString(36).substr(2, 9)

  // Add toast
  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = generateId()
    const toast = {
      id,
      message,
      type, // success, error, warning, info
      duration,
      timestamp: Date.now()
    }

    setToasts(prev => [...prev, toast])

    // Auto remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [])

  // Remove toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods
  const showSuccess = useCallback((message, duration) => {
    return addToast(message, 'success', duration)
  }, [addToast])

  const showError = useCallback((message, duration) => {
    return addToast(message, 'error', duration)
  }, [addToast])

  const showWarning = useCallback((message, duration) => {
    return addToast(message, 'warning', duration)
  }, [addToast])

  const showInfo = useCallback((message, duration) => {
    return addToast(message, 'info', duration)
  }, [addToast])

  const value = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}
