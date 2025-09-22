// src/components/master-data/MasterDataLayout.js
import React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

const MasterDataLayout = ({ children, activeTab }) => {
  const router = useRouter()

  const tabs = [
    {
      id: 'chart-of-accounts',
      label: 'Chart of Accounts',
      path: '/master-data/chart-of-accounts',
      description: 'Manage your account hierarchy'
    },
    {
      id: 'tax-rates',
      label: 'Tax Rates',
      path: '/master-data/tax-rates',
      description: 'Configure GST and other tax rates'
    },
    {
      id: 'units',
      label: 'Units',
      path: '/master-data/units',
      description: 'Measurement units for items'
    },
    {
      id: 'payment-terms',
      label: 'Payment Terms',
      path: '/master-data/payment-terms',
      description: 'Payment term configurations'
    },
    {
      id: 'bank-accounts',
      label: 'Bank Accounts',
      path: '/master-data/bank-accounts',
      description: 'Company bank account details'
    },
    {
      id: 'currency',
      label: 'Currency',
      path: '/master-data/currency',
      description: 'Multi-currency settings'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Master Data</h1>
                <p className="text-gray-600 mt-1">
                  Configure foundational data for your accounting system
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id || router.pathname === tab.path
                
                return (
                  <Link
                    key={tab.id}
                    href={tab.path}
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{tab.description}</div>
                    </div>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MasterDataLayout