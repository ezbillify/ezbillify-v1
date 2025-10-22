import { useState } from 'react'
import { useRouter } from 'next/router'

const MasterDataLayout = ({ children, title, showAddButton = false, onAdd, addButtonText = "Add New" }) => {
  const router = useRouter()
  const currentPath = router.pathname

  const menuItems = [
    { 
      path: '/master-data/chart-of-accounts', 
      label: 'Chart of Accounts',
      description: 'Accounting structure setup'
    },
    { 
      path: '/master-data/tax-rates', 
      label: 'Tax Rates',
      description: 'GST and tax configuration'
    },
    { 
      path: '/master-data/categories', 
      label: 'Categories',
      description: 'Product categories'
    },
    { 
      path: '/master-data/units', 
      label: 'Units',
      description: 'Measurement units'
    },
    { 
      path: '/master-data/bank-accounts', 
      label: 'Bank Accounts',
      description: 'Payment accounts'
    },
    { 
      path: '/master-data/currency', 
      label: 'Currency',
      description: 'Multi-currency setup'
    },
    { 
      path: '/master-data/payment-terms', 
      label: 'Payment Terms',
      description: 'Payment conditions'
    }
  ]

  const isActive = (path) => currentPath === path

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all hover:gap-3 group"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">←</span>
                <span className="font-medium">Back</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title || "Master Data"}</h1>
                <p className="text-sm text-gray-600 mt-0.5">Configure foundational business data</p>
              </div>
            </div>
            {showAddButton && (
              <button
                onClick={onAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
              >
                {addButtonText}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/70 overflow-hidden sticky top-24">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700">
                <h2 className="text-lg font-semibold text-white">Master Data Menu</h2>
                <p className="text-blue-100 text-sm mt-1">Choose a category</p>
              </div>
              
              <nav className="p-2">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-all duration-200 group ${
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-600/20'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${
                          isActive(item.path) ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          {item.label}
                        </div>
                        <div className={`text-xs mt-0.5 truncate ${
                          isActive(item.path) ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {item.description}
                        </div>
                      </div>
                      {isActive(item.path) && (
                        <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MasterDataLayout