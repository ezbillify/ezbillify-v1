import { useState } from 'react'
import { useRouter } from 'next/router'

const MasterDataLayout = ({ children, title, showAddButton = false, onAdd, addButtonText = "Add New" }) => {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Simple Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title || "Master Data"}</h1>
                <p className="mt-1 text-sm text-gray-600">Configure foundational business data</p>
              </div>
            </div>
            {showAddButton && (
              <button
                onClick={onAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {addButtonText}
              </button>
            )}
          </div>
        </div>

        {/* Simple Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Master Data</h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/master-data/chart-of-accounts')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Chart of Accounts
                </button>
                <button
                  onClick={() => router.push('/master-data/tax-rates')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Tax Rates
                </button>
                <button
                  onClick={() => router.push('/master-data/units')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Units
                </button>
                <button
                  onClick={() => router.push('/master-data/bank-accounts')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Bank Accounts
                </button>
                <button
                  onClick={() => router.push('/master-data/currency')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Currency
                </button>
                <button
                  onClick={() => router.push('/master-data/payment-terms')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Payment Terms
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MasterDataLayout
