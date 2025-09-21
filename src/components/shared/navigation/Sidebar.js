// src/components/shared/navigation/Sidebar.js
import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../../context/AuthContext'
import { useCompany } from '../../../context/CompanyContext'
import Badge from '../ui/Badge'

const Sidebar = ({ isCollapsed = false, onToggle }) => {
  const router = useRouter()
  const { user, signOut, getUserDisplayName } = useAuth()
  const { company } = useCompany()
  const [expandedMenus, setExpandedMenus] = useState({})

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7zm0 0h16" />
        </svg>
      )
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      submenu: [
        { label: 'Customers', href: '/sales/customers' },
        { label: 'Quotations', href: '/sales/quotations' },
        { label: 'Sales Orders', href: '/sales/sales-orders' },
        { label: 'Invoices', href: '/sales/invoices' },
        { label: 'Payments', href: '/sales/payments' },
        { label: 'Returns', href: '/sales/returns' },
        { label: 'E-Invoice', href: '/sales/e-invoice' },
        { label: 'E-Way Bills', href: '/sales/e-way-bills' }
      ]
    },
    {
      id: 'purchase',
      label: 'Purchase',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      submenu: [
        { label: 'Vendors', href: '/purchase/vendors' },
        { label: 'Purchase Orders', href: '/purchase/purchase-orders' },
        { label: 'Bills', href: '/purchase/bills' },
        { label: 'GRN', href: '/purchase/grn' },
        { label: 'Payments Made', href: '/purchase/payments-made' },
        { label: 'Returns', href: '/purchase/returns' }
      ]
    },
    {
      id: 'items',
      label: 'Items',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      submenu: [
        { label: 'Item List', href: '/items/item-list' },
        { label: 'Current Stock', href: '/items/current-stock' },
        { label: 'Stock Adjustment', href: '/items/stock-adjustment' }
      ]
    },
    {
      id: 'accounting',
      label: 'Accounting',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      submenu: [
        { label: 'Journal Entries', href: '/accounting/journal-entries' },
        { label: 'General Ledger', href: '/accounting/general-ledger' },
        { label: 'Trial Balance', href: '/accounting/trial-balance' },
        { label: 'Financial Statements', href: '/accounting/financial-statements' },
        { label: 'Bank Reconciliation', href: '/accounting/bank-reconciliation' },
        { label: 'Cash Flow', href: '/accounting/cash-flow' },
        { label: 'Reports', href: '/accounting/reports' }
      ]
    },
    {
      id: 'gst-filings',
      label: 'GST Filings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      submenu: [
        { label: 'Compliance', href: '/gst-filings/compliance' },
        { label: 'GSTR-1', href: '/gst-filings/gstr1' },
        { label: 'GSTR-2', href: '/gst-filings/gstr2' },
        { label: 'GSTR-3B', href: '/gst-filings/gstr3b' },
        { label: 'Reconciliation', href: '/gst-filings/reconciliation' }
      ]
    },
    {
      id: 'master-data',
      label: 'Master Data',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
      submenu: [
        { label: 'Chart of Accounts', href: '/master-data/chart-of-accounts' },
        { label: 'Bank Accounts', href: '/master-data/bank-accounts' },
        { label: 'Tax Rates', href: '/master-data/tax-rates' },
        { label: 'Units', href: '/master-data/units' },
        { label: 'Payment Terms', href: '/master-data/payment-terms' },
        { label: 'Currency', href: '/master-data/currency' }
      ]
    },
    {
      id: 'others',
      label: 'Others',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      submenu: [
        { label: 'Settings', href: '/others/settings' },
        { label: 'Users', href: '/others/users' },
        { label: 'Integrations', href: '/others/integrations' },
        { label: 'Utilities', href: '/others/utilities' }
      ]
    }
  ]

  const toggleSubmenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }))
  }

  const isActiveRoute = (href) => {
    return router.pathname === href || router.pathname.startsWith(href + '/')
  }

  const hasActiveSubmenu = (submenu) => {
    return submenu?.some(item => isActiveRoute(item.href))
  }

  return (
    <div className={`
      fixed left-0 top-0 h-full bg-white/95 backdrop-blur-md border-r border-slate-200 
      shadow-xl shadow-slate-200/50 z-40 transition-all duration-300
      ${isCollapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">EZ</span>
              </div>
              <div>
                <h2 className="font-bold text-slate-900">EzBillify</h2>
                <p className="text-xs text-slate-500">V1.0</p>
              </div>
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className={`w-4 h-4 text-slate-600 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Company Info */}
      {!isCollapsed && company && (
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{company.name}</p>
              <p className="text-xs text-slate-500 truncate">{company.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = item.href ? isActiveRoute(item.href) : hasActiveSubmenu(item.submenu)
            const isExpanded = expandedMenus[item.id]

            return (
              <div key={item.id}>
                {/* Main Menu Item */}
                <button
                  onClick={() => {
                    if (item.href) {
                      router.push(item.href)
                    } else {
                      toggleSubmenu(item.id)
                    }
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <span className={isActive ? 'text-blue-600' : 'text-slate-500'}>
                      {item.icon}
                    </span>
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  
                  {!isCollapsed && item.submenu && (
                    <svg 
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {/* Submenu */}
                {!isCollapsed && item.submenu && isExpanded && (
                  <div className="mt-1 space-y-1 pl-8">
                    {item.submenu.map((subItem) => (
                      <button
                        key={subItem.href}
                        onClick={() => router.push(subItem.href)}
                        className={`
                          w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                          ${isActiveRoute(subItem.href)
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }
                        `}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* User Profile & Logout */}
      <div className="border-t border-slate-200 p-4">
        {!isCollapsed ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{getUserDisplayName()}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            
            <button
              onClick={signOut}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-medium text-sm">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
