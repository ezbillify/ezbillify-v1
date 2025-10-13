import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'

const MasterDataIndex = () => {
  const router = useRouter()
  const { company } = useAuth()
  const [stats, setStats] = useState({
    accounts: 0,
    taxRates: 0,
    units: 0,
    bankAccounts: 0,
    currencies: 0,
    paymentTerms: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (company?.id) {
      fetchStats()
    }
  }, [company?.id])

  const fetchStats = async () => {
    try {
      setLoading(true)
      
      const [
        accountsResult,
        taxRatesResult,
        unitsResult,
        bankAccountsResult,
        currenciesResult,
        paymentTermsResult
      ] = await Promise.all([
        supabase.from('chart_of_accounts').select('id').eq('company_id', company.id),
        supabase.from('tax_rates').select('id').eq('company_id', company.id),
        supabase.from('units').select('id').or(`company_id.eq.${company.id},company_id.is.null`),
        supabase.from('bank_accounts').select('id').eq('company_id', company.id),
        supabase.from('currencies').select('id').eq('company_id', company.id),
        supabase.from('payment_terms').select('id').eq('company_id', company.id)
      ])

      setStats({
        accounts: accountsResult.data?.length || 0,
        taxRates: taxRatesResult.data?.length || 0,
        units: unitsResult.data?.length || 0,
        bankAccounts: bankAccountsResult.data?.length || 0,
        currencies: currenciesResult.data?.length || 0,
        paymentTerms: paymentTermsResult.data?.length || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const masterDataItems = [
    {
      title: "Chart of Accounts",
      description: "Define your accounting structure with assets, liabilities, income, and expense accounts",
      path: "/master-data/chart-of-accounts",
      color: "blue",
      icon: "💰",
      count: stats.accounts,
      setup: stats.accounts > 0,
      priority: "High"
    },
    {
      title: "Tax Rates",
      description: "Configure GST rates, VAT, and other tax calculations for your business",
      path: "/master-data/tax-rates",
      color: "green",
      icon: "⚖️",
      count: stats.taxRates,
      setup: stats.taxRates > 0,
      priority: "High"
    },
    {
      title: "Units of Measurement",
      description: "Set up units like pieces, kilograms, meters with conversion factors",
      path: "/master-data/units",
      color: "purple",
      icon: "📏",
      count: stats.units,
      setup: stats.units > 0,
      priority: "Medium"
    },
    {
      title: "Bank Accounts",
      description: "Add your business bank accounts for payment tracking and reconciliation",
      path: "/master-data/bank-accounts",
      color: "indigo",
      icon: "🏦",
      count: stats.bankAccounts,
      setup: stats.bankAccounts > 0,
      priority: "High"
    },
    {
      title: "Currencies",
      description: "Multi-currency setup with exchange rates for international business",
      path: "/master-data/currency",
      color: "pink",
      icon: "🌍",
      count: stats.currencies,
      setup: stats.currencies > 0,
      priority: "Low"
    },
    {
      title: "Payment Terms",
      description: "Define payment terms like Net 30, Due on Receipt for customers and vendors",
      path: "/master-data/payment-terms",
      color: "orange",
      icon: "⏰",
      count: stats.paymentTerms,
      setup: stats.paymentTerms > 0,
      priority: "Medium"
    }
  ]

  const setupProgress = masterDataItems.filter(item => item.setup).length
  const totalItems = masterDataItems.length
  const progressPercentage = (setupProgress / totalItems) * 100

  const getColorClasses = (color, variant = 'badge') => {
    const colors = {
      blue: {
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        card: 'from-blue-50 to-blue-100/50 border-blue-200/70',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      green: {
        badge: 'bg-green-50 text-green-700 border-green-200',
        card: 'from-green-50 to-green-100/50 border-green-200/70',
        button: 'bg-green-600 hover:bg-green-700'
      },
      purple: {
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        card: 'from-purple-50 to-purple-100/50 border-purple-200/70',
        button: 'bg-purple-600 hover:bg-purple-700'
      },
      indigo: {
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        card: 'from-indigo-50 to-indigo-100/50 border-indigo-200/70',
        button: 'bg-indigo-600 hover:bg-indigo-700'
      },
      pink: {
        badge: 'bg-pink-50 text-pink-700 border-pink-200',
        card: 'from-pink-50 to-pink-100/50 border-pink-200/70',
        button: 'bg-pink-600 hover:bg-pink-700'
      },
      orange: {
        badge: 'bg-orange-50 text-orange-700 border-orange-200',
        card: 'from-orange-50 to-orange-100/50 border-orange-200/70',
        button: 'bg-orange-600 hover:bg-orange-700'
      }
    }
    return colors[color]?.[variant] || colors.blue[variant]
  }

  const getPriorityBadge = (priority) => {
    const styles = {
      High: 'bg-red-100 text-red-700 border border-red-200',
      Medium: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      Low: 'bg-gray-100 text-gray-700 border border-gray-200'
    }
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${styles[priority]}`}>
        {priority}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all hover:gap-3 group"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">←</span>
                <span className="font-medium">Back</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Master Data</h1>
                <p className="text-sm text-gray-600 mt-0.5">Configure core business data and settings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Setup Progress Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/70 overflow-hidden">
            <div className="border-b border-gray-200/70 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Setup Progress</h3>
              <p className="text-sm text-gray-600">Track your master data configuration</p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Master Data Configuration
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {setupProgress} of {totalItems} completed
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-blue-700 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              {progressPercentage < 100 ? (
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    Complete your master data setup to enable full EzBillify functionality
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-green-800">
                    Master data setup is complete! You're ready to start creating items and invoices.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Master Data Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/70 overflow-hidden">
            <div className="border-b border-gray-200/70 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Master Data Overview</h3>
              <p className="text-sm text-gray-600">Manage all your master data configurations</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {masterDataItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className="text-left border border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-12 h-12 rounded-lg ${getColorClasses(item.color, 'badge')} flex items-center justify-center text-2xl border transition-all group-hover:scale-110`}>
                        {item.icon}
                      </div>
                      {getPriorityBadge(item.priority)}
                    </div>
                    
                    <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {item.count}
                        </span>
                        <span className="text-sm text-gray-500">
                          {item.count === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        item.setup 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : 'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {item.setup ? '✓ Setup' : 'Pending'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* High Priority Setup Recommendations */}
          {progressPercentage < 100 && masterDataItems.filter(item => !item.setup && item.priority === 'High').length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50/30 border border-red-200/70 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-red-100/50 to-orange-100/30 px-6 py-4 border-b border-red-200/50">
                <h3 className="text-lg font-semibold text-red-900">⚠️ High Priority Setup</h3>
                <p className="text-sm text-red-700 mt-0.5">Complete these essential configurations first</p>
              </div>
              
              <div className="p-6 space-y-3">
                {masterDataItems
                  .filter(item => !item.setup && item.priority === 'High')
                  .map(item => (
                    <div 
                      key={item.path} 
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200 shadow-sm"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg ${getColorClasses(item.color, 'badge')} flex items-center justify-center text-xl border`}>
                          {item.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{item.title}</div>
                          <div className="text-sm text-gray-600">Required for core functionality</div>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(item.path)}
                        className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                      >
                        Setup Now
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/70 overflow-hidden">
            <div className="border-b border-gray-200/70 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              <p className="text-sm text-gray-600">Common master data configurations</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => router.push('/master-data/chart-of-accounts')}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        Chart of Accounts
                      </div>
                      <div className="text-sm text-gray-600">
                        Essential for financial tracking
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/master-data/tax-rates')}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-green-300 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
                        Tax Rates
                      </div>
                      <div className="text-sm text-gray-600">
                        GST, VAT, and other taxes
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/master-data/bank-accounts')}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-indigo-300 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                        Bank Accounts
                      </div>
                      <div className="text-sm text-gray-600">
                        For payment processing
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Helpful Tip */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/30 border border-amber-200/70 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900">Helpful Tip</h4>
                <p className="mt-1.5 text-sm text-amber-800 leading-relaxed">
                  Master data forms the foundation of your EzBillify system. Start with Chart of Accounts and Tax Rates for essential functionality, then configure other settings based on your business needs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MasterDataIndex