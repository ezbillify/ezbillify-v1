// src/pages/dashboard.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/shared/layout/AppLayout'
import MetricCards from '../components/dashboard/MetricCards'
import QuickActions from '../components/dashboard/QuickActions'
import RecentActivity from '../components/dashboard/RecentActivity'
import SalesTrend from '../components/dashboard/SalesTrend'
import Button from '../components/shared/ui/Button'
import companyService from '../services/companyService'

const DashboardPage = () => {
  const { user, company, loading, initialized, isAuthenticated, hasCompany, isWorkforce } = useAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    loading: true,
    error: null
  })
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Handle redirects when auth state is known
  useEffect(() => {
    // Wait for auth to initialize
    if (!initialized) return

    // 🔒 Block workforce users from accessing web dashboard
    if (isWorkforce) {
      console.log('Dashboard - Workforce user detected, blocking access')
      router.replace('/login')
      return
    }

    // Handle redirections
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    
    if (!hasCompany) {
      router.replace('/setup')
      return
    }
  }, [initialized, isAuthenticated, hasCompany, isWorkforce, router])

  // Fetch dashboard data when company is available
  useEffect(() => {
    if (!company) return

    const fetchDashboardData = async () => {
      try {
        setDashboardData(prev => ({ ...prev, loading: true, error: null }))
        
        const { success, data, error } = await companyService.getCompanyStats(company.id)
        
        if (success) {
          setDashboardData({ 
            stats: data, 
            loading: false,
            error: null
          })
        } else {
          setDashboardData({ 
            stats: null,
            error: error || 'Failed to load dashboard data', 
            loading: false 
          })
        }
      } catch (err) {
        setDashboardData({ 
          stats: null,
          error: 'Failed to load dashboard data', 
          loading: false 
        })
      }
    }

    fetchDashboardData()
  }, [company])

  // Auto-refresh dashboard data every 30 seconds
  useEffect(() => {
    if (!company) return

    const interval = setInterval(() => {
      const fetchDashboardData = async () => {
        try {
          // Clear cache before auto-refresh to ensure fresh data
          companyService.clearStatsCache(company.id)
          
          const { success, data, error } = await companyService.getCompanyStats(company.id)
          
          if (success) {
            setDashboardData(prev => ({ 
              ...prev,
              stats: data,
              error: null
            }))
            setLastUpdated(new Date())
          }
        } catch (err) {
          // Don't show error for auto-refresh, just continue
          console.log('Auto-refresh failed:', err.message)
        }
      }

      fetchDashboardData()
    }, 30 * 1000) // 30 seconds

    return () => clearInterval(interval)
  }, [company])

  // Add retry function
  const retryFetch = async () => {
    if (!company) return
    
    try {
      // Clear cache before retrying
      companyService.clearStatsCache(company.id)
      
      setDashboardData(prev => ({ ...prev, loading: true, error: null }))
      
      const { success, data, error } = await companyService.getCompanyStats(company.id)
      
      if (success) {
        setDashboardData({ 
          stats: data, 
          loading: false,
          error: null
        })
        setLastUpdated(new Date())
      } else {
        setDashboardData({ 
          stats: null,
          error: error || 'Failed to load dashboard data', 
          loading: false 
        })
      }
    } catch (err) {
      setDashboardData({ 
        stats: null,
        error: 'Failed to load dashboard data', 
        loading: false 
      })
    }
  }

  // Add refresh function that bypasses cache
  const refreshData = async () => {
    if (!company) return
    
    try {
      // Clear cache before fetching
      companyService.clearStatsCache(company.id)
      
      setDashboardData(prev => ({ ...prev, loading: true, error: null }))
      
      const { success, data, error } = await companyService.getCompanyStats(company.id)
      
      if (success) {
        setDashboardData({ 
          stats: data, 
          loading: false,
          error: null
        })
        setLastUpdated(new Date())
      } else {
        setDashboardData({ 
          stats: null,
          error: error || 'Failed to load dashboard data', 
          loading: false 
        })
      }
    } catch (err) {
      setDashboardData({ 
        stats: null,
        error: 'Failed to load dashboard data', 
        loading: false 
      })
    }
  }

  // Show loading while auth is initializing or during redirects
  if (!initialized || loading || (!isAuthenticated || !hasCompany)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">
            {!initialized ? 'Initializing...' : 
             !isAuthenticated ? 'Redirecting to login...' :
             !hasCompany ? 'Redirecting to setup...' : 
             'Loading dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  // Error boundary for dashboard components
  if (dashboardData.error) {
    return (
      <AppLayout 
        title="Dashboard" 
        breadcrumbs={breadcrumbs}
        actions={actions}
      >
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800">Error Loading Dashboard</h3>
          </div>
          <p className="mt-2 text-red-700">{dashboardData.error}</p>
          <div className="mt-4">
            <Button
              variant="primary"
              onClick={retryFetch}
            >
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard', current: true }
  ]

  const actions = (
    <div className="flex items-center space-x-3">
      <Button
        variant="primary"
        onClick={() => router.push('/sales/invoices/new')}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
      >
        Create Invoice
      </Button>
      
      <Button
        variant="outline"
        onClick={() => router.push('/sales')}
      >
        Quick Actions
      </Button>
      
      <Button
        variant="outline"
        onClick={refreshData}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        }
      >
        Refresh
      </Button>
    </div>
  )

  return (
    <>
      <Head>
        <title>Dashboard - EzBillify</title>
        <meta name="description" content="EzBillify Dashboard - Manage your business finances" />
      </Head>

      <AppLayout 
        title="Dashboard" 
        breadcrumbs={breadcrumbs}
        actions={actions}
      >
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Welcome back, {company.name}!
                </h1>
                <p className="text-blue-100">
                  Here's what's happening with your business today
                </p>
                <p className="text-blue-200 text-sm mt-2">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <MetricCards 
            stats={dashboardData.stats} 
            loading={dashboardData.loading} 
            error={dashboardData.error}
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Sales Trend Chart */}
              <SalesTrend companyId={company.id} />

              {/* Recent Activity */}
              <RecentActivity companyId={company.id} />
            </div>

            {/* Right Column - 1/3 width */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <QuickActions />

              {/* Company Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Company Info</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    {company.logo_url ? (
                      <img 
                        src={company.logo_url} 
                        alt={company.name} 
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {company.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{company.name}</p>
                      <p className="text-sm text-slate-500">{company.business_type}</p>
                    </div>
                  </div>

                  {company.gstin && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">GSTIN</p>
                      <p className="font-mono text-sm text-slate-900">{company.gstin}</p>
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700">Active</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Plan</p>
                    <p className="text-sm font-medium text-slate-900 capitalize">
                      {company.subscription_plan || 'Basic'}
                    </p>
                  </div>
                </div>
              </div>

              {/* GST Compliance Status */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">GST Compliance</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700">GSTR-1</span>
                    </div>
                    <span className="text-xs text-green-600">Filed</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm font-medium text-yellow-700">GSTR-3B</span>
                    </div>
                    <span className="text-xs text-yellow-600">Pending</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-700">E-Invoices</span>
                    </div>
                    <span className="text-xs text-blue-600">Active</span>
                  </div>
                </div>

                <button className="w-full mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                  View Compliance Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </>
  )
}

export default DashboardPage