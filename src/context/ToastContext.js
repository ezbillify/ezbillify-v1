// src/context/ToastContext.js
import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext({})

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      ...toast
    }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
    
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const removeAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Helper methods for different toast types
  const success = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'success' })
  }, [addToast])

  const error = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'error', duration: 7000 })
  }, [addToast])

  const warning = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'warning' })
  }, [addToast])

  const info = useCallback((message, options = {}) => {
    return addToast({ ...options, message, type: 'info' })
  }, [addToast])

  const value = {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    success,
    error,
    warning,
    info
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastContext