// src/components/shared/ui/Loading.js
import React from 'react'

const Loading = ({ 
  size = 'md', 
  variant = 'spinner',
  color = 'blue',
  text,
  fullScreen = false,
  className = '' 
}) => {
  const sizes = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const colors = {
    blue: 'text-blue-600',
    slate: 'text-slate-600',
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600'
  }

  const Spinner = () => (
    <svg 
      className={`animate-spin ${sizes[size]} ${colors[color]}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  const Dots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`
            rounded-full animate-bounce
            ${size === 'xs' ? 'w-1 h-1' : ''}
            ${size === 'sm' ? 'w-1.5 h-1.5' : ''}
            ${size === 'md' ? 'w-2 h-2' : ''}
            ${size === 'lg' ? 'w-3 h-3' : ''}
            ${size === 'xl' ? 'w-4 h-4' : ''}
            ${color === 'blue' ? 'bg-blue-600' : ''}
            ${color === 'slate' ? 'bg-slate-600' : ''}
            ${color === 'emerald' ? 'bg-emerald-600' : ''}
            ${color === 'red' ? 'bg-red-600' : ''}
            ${color === 'amber' ? 'bg-amber-600' : ''}
          `}
          style={{
            animationDelay: `${index * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  )

  const Pulse = () => (
    <div className={`
      rounded-full animate-pulse
      ${sizes[size]}
      ${color === 'blue' ? 'bg-blue-600' : ''}
      ${color === 'slate' ? 'bg-slate-600' : ''}
      ${color === 'emerald' ? 'bg-emerald-600' : ''}
      ${color === 'red' ? 'bg-red-600' : ''}
      ${color === 'amber' ? 'bg-amber-600' : ''}
    `} />
  )

  const Bars = () => (
    <div className="flex items-end space-x-1">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={`
            animate-pulse
            ${size === 'xs' ? 'w-0.5' : ''}
            ${size === 'sm' ? 'w-1' : ''}
            ${size === 'md' ? 'w-1.5' : ''}
            ${size === 'lg' ? 'w-2' : ''}
            ${size === 'xl' ? 'w-3' : ''}
            ${color === 'blue' ? 'bg-blue-600' : ''}
            ${color === 'slate' ? 'bg-slate-600' : ''}
            ${color === 'emerald' ? 'bg-emerald-600' : ''}
            ${color === 'red' ? 'bg-red-600' : ''}
            ${color === 'amber' ? 'bg-amber-600' : ''}
          `}
          style={{
            height: `${(index + 1) * (size === 'xs' ? 4 : size === 'sm' ? 6 : size === 'md' ? 8 : size === 'lg' ? 12 : 16)}px`,
            animationDelay: `${index * 0.15}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  )

  const EzBillifyLogo = () => (
    <div className={`${sizes[size]} relative`}>
      <div className={`absolute inset-0 ${colors[color]} animate-spin`}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`w-2 h-2 ${color === 'blue' ? 'bg-blue-600' : color === 'slate' ? 'bg-slate-600' : color === 'emerald' ? 'bg-emerald-600' : color === 'red' ? 'bg-red-600' : 'bg-amber-600'} rounded-full animate-pulse`} />
      </div>
    </div>
  )

  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return <Dots />
      case 'pulse':
        return <Pulse />
      case 'bars':
        return <Bars />
      case 'logo':
        return <EzBillifyLogo />
      default:
        return <Spinner />
    }
  }

  const LoadingContent = () => (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderVariant()}
      {text && (
        <p className={`text-sm font-medium ${colors[color]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200/50">
          <LoadingContent />
        </div>
      </div>
    )
  }

  return <LoadingContent />
}

// Specialized Loading Components
export const PageLoading = ({ text = "Loading..." }) => (
  <Loading 
    size="lg" 
    variant="logo" 
    text={text} 
    fullScreen 
    className="p-8" 
  />
)

export const ButtonLoading = ({ size = 'sm' }) => (
  <Loading 
    size={size} 
    variant="spinner" 
    color="white" 
  />
)

export const TableLoading = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          <div className="h-4 bg-slate-200 rounded col-span-2"></div>
          <div className="h-4 bg-slate-200 rounded"></div>
          <div className="h-4 bg-slate-200 rounded"></div>
        </div>
      </div>
    ))}
  </div>
)

export const CardLoading = () => (
  <div className="animate-pulse bg-white rounded-2xl border border-slate-200 p-6">
    <div className="flex items-center space-x-4 mb-4">
      <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-3 bg-slate-200 rounded"></div>
      <div className="h-3 bg-slate-200 rounded w-5/6"></div>
      <div className="h-3 bg-slate-200 rounded w-4/6"></div>
    </div>
  </div>
)

export const InlineLoading = ({ text }) => (
  <div className="flex items-center space-x-2">
    <Loading size="xs" variant="spinner" />
    {text && <span className="text-sm text-slate-600">{text}</span>}
  </div>
)

export default Loading
