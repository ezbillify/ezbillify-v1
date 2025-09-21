// src/components/shared/navigation/TopBar.js
import React from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../../context/AuthContext'

export const TopBar = ({ title, onSidebarToggle, actions, breadcrumbs }) => {
  const { company } = useAuth()
  const router = useRouter()
  
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left Side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onSidebarToggle}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors lg:hidden"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {breadcrumbs && (
              <nav className="flex items-center space-x-2 text-sm text-slate-500 mt-1">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    {index > 0 && <span>/</span>}
                    {crumb.href ? (
                      <button
                        onClick={() => router.push(crumb.href)}
                        className="hover:text-slate-700 transition-colors"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="text-slate-900 font-medium">{crumb.label}</span>
                    )}
                  </div>
                ))}
              </nav>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {actions}
          
          {/* Quick Stats */}
          {company && (
            <div className="hidden md:flex items-center space-x-4 text-sm">
              <div className="text-center">
                <p className="text-slate-500">Currency</p>
                <p className="font-medium text-slate-900">{company.billing_currency || 'INR'}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-500">Plan</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {company.subscription_plan || 'Basic'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopBar