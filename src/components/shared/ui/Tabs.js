// src/components/shared/ui/Tabs.js
import React, { useState, createContext, useContext } from 'react'

const TabsContext = createContext()

const Tabs = ({ 
  children, 
  defaultValue, 
  value: controlledValue,
  onValueChange,
  orientation = 'horizontal',
  variant = 'default',
  className = ''
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue)
  
  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : internalValue
  
  const handleValueChange = (newValue) => {
    if (!isControlled) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  const contextValue = {
    value: currentValue,
    onValueChange: handleValueChange,
    orientation,
    variant
  }

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={`tabs-container ${orientation} ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export const TabsList = ({ children, className = '' }) => {
  const { orientation, variant } = useContext(TabsContext)
  
  const variants = {
    default: 'bg-slate-100/80 backdrop-blur-sm border border-slate-200',
    pills: 'bg-transparent',
    underline: 'bg-transparent border-b border-slate-200',
    cards: 'bg-white border border-slate-200 shadow-sm'
  }
  
  const orientationClasses = {
    horizontal: 'flex flex-row',
    vertical: 'flex flex-col'
  }
  
  return (
    <div className={`
      ${orientationClasses[orientation]}
      ${variants[variant]}
      ${variant === 'default' || variant === 'cards' ? 'p-1 rounded-xl' : ''}
      ${className}
    `}>
      {children}
    </div>
  )
}

export const TabsTrigger = ({ 
  children, 
  value, 
  disabled = false,
  icon,
  badge,
  className = '' 
}) => {
  const { value: activeValue, onValueChange, variant } = useContext(TabsContext)
  const isActive = activeValue === value
  
  const handleClick = () => {
    if (!disabled) {
      onValueChange(value)
    }
  }

  const variants = {
    default: {
      base: 'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
      active: 'bg-white text-slate-900 shadow-sm border border-slate-200',
      inactive: 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
    },
    pills: {
      base: 'px-4 py-2 text-sm font-medium rounded-full transition-all duration-200',
      active: 'bg-blue-100 text-blue-700 border border-blue-200',
      inactive: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    },
    underline: {
      base: 'px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200',
      active: 'border-blue-500 text-blue-600',
      inactive: 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
    },
    cards: {
      base: 'px-4 py-3 text-sm font-medium transition-all duration-200',
      active: 'bg-blue-50 text-blue-700 border-r-2 border-r-blue-500',
      inactive: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }
  }

  const variantConfig = variants[variant]
  const stateClasses = isActive ? variantConfig.active : variantConfig.inactive
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'

  return (
    <button
      type="button"
      className={`
        ${variantConfig.base}
        ${stateClasses}
        ${disabledClasses}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        relative flex items-center space-x-2
        ${className}
      `}
      onClick={handleClick}
      disabled={disabled}
      role="tab"
      aria-selected={isActive}
    >
      {/* Icon */}
      {icon && (
        <span className="flex-shrink-0">
          {icon}
        </span>
      )}
      
      {/* Label */}
      <span className="flex-1 text-left">{children}</span>
      
      {/* Badge */}
      {badge && (
        <span className={`
          inline-flex items-center justify-center min-w-[18px] h-5 px-1.5 
          text-xs font-bold rounded-full
          ${isActive 
            ? 'bg-blue-500 text-white' 
            : 'bg-slate-400 text-white'
          }
        `}>
          {badge}
        </span>
      )}
      
      {/* Active indicator for underline variant */}
      {variant === 'underline' && isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
      )}
    </button>
  )
}

export const TabsContent = ({ 
  children, 
  value, 
  className = '',
  forceMount = false 
}) => {
  const { value: activeValue } = useContext(TabsContext)
  const isActive = activeValue === value
  
  if (!isActive && !forceMount) {
    return null
  }

  return (
    <div 
      className={`
        tab-content transition-all duration-200
        ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        ${className}
      `}
      role="tabpanel"
      hidden={!isActive}
    >
      {children}
    </div>
  )
}

// Specialized Tab Components for EzBillify
export const InvoiceTabs = ({ children, ...props }) => {
  return (
    <Tabs variant="underline" {...props}>
      <TabsList className="border-b border-slate-200 bg-white">
        <TabsTrigger 
          value="all" 
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          All Invoices
        </TabsTrigger>
        <TabsTrigger 
          value="draft"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        >
          Drafts
        </TabsTrigger>
        <TabsTrigger 
          value="sent"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          }
        >
          Sent
        </TabsTrigger>
        <TabsTrigger 
          value="paid"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          Paid
        </TabsTrigger>
        <TabsTrigger 
          value="overdue"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          Overdue
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  )
}

export const DashboardTabs = ({ children, ...props }) => {
  return (
    <Tabs variant="pills" {...props}>
      <TabsList className="bg-slate-100 p-1 rounded-xl">
        <TabsTrigger 
          value="overview"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        >
          Overview
        </TabsTrigger>
        <TabsTrigger 
          value="sales"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        >
          Sales
        </TabsTrigger>
        <TabsTrigger 
          value="expenses"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
            </svg>
          }
        >
          Expenses
        </TabsTrigger>
        <TabsTrigger 
          value="reports"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          Reports
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  )
}

export const SettingsTabs = ({ children, ...props }) => {
  return (
    <Tabs variant="cards" orientation="vertical" {...props}>
      <TabsList className="w-64 space-y-1">
        <TabsTrigger 
          value="company"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        >
          Company Profile
        </TabsTrigger>
        <TabsTrigger 
          value="users"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          }
        >
          User Management
        </TabsTrigger>
        <TabsTrigger 
          value="billing"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        >
          Billing Settings
        </TabsTrigger>
        <TabsTrigger 
          value="integrations"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          }
        >
          Integrations
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  )
}

export default Tabs
