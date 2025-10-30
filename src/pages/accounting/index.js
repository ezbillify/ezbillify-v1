import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../services/utils/supabase'
import AppLayout from '../../components/shared/layout/AppLayout'

const AccountingDashboard = () => {
  const router = useRouter()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalAccounts: 0,
    totalJournalEntries: 0,
    recentEntries: []
  })

  useEffect(() => {
    fetchCompanyData()
  }, [])

  const fetchCompanyData = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get user's company
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('company_id, company:companies(name)')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setCompany({
        id: userProfile.company_id,
        name: userProfile.company.name
      })

      // Fetch accounting summary
      await fetchAccountingSummary(userProfile.company_id)
    } catch (error) {
      console.error('Error fetching company data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAccountingSummary = async (companyId) => {
    try {
      // Get total accounts
      const { count: accountsCount } = await supabase
        .from('chart_of_accounts')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)

      // Get total journal entries
      const { count: entriesCount } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)

      // Get recent journal entries
      const { data: recentEntries } = await supabase
        .from('journal_entries')
        .select('id, entry_number, entry_date, narration, total_debit, total_credit, status')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5)

      setSummary({
        totalAccounts: accountsCount || 0,
        totalJournalEntries: entriesCount || 0,
        recentEntries: recentEntries || []
      })
    } catch (error) {
      console.error('Error fetching accounting summary:', error)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  if (loading) {
    return (
      <AppLayout
        title="Accounting Dashboard"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Accounting', href: '/accounting' }
        ]}
      >
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      title="Accounting Dashboard"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Accounting', href: '/accounting' }
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accounting Dashboard</h1>
            <p className="text-gray-600">Manage your financial records and reports</p>
          </div>
          <button
            onClick={() => router.push('/accounting/journal-entries')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            New Journal Entry
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Accounts</h3>
                <p className="text-2xl font-bold text-gray-900">{summary.totalAccounts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Journal Entries</h3>
                <p className="text-2xl font-bold text-gray-900">{summary.totalJournalEntries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Recent Activity</h3>
                <p className="text-2xl font-bold text-gray-900">{summary.recentEntries.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/accounting/chart-of-accounts')}
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-3 bg-blue-100 rounded-lg mb-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Chart of Accounts</span>
              </button>

              <button
                onClick={() => router.push('/accounting/journal-entries')}
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-3 bg-green-100 rounded-lg mb-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Journal Entries</span>
              </button>

              <button
                onClick={() => router.push('/accounting/general-ledger')}
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-3 bg-purple-100 rounded-lg mb-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">General Ledger</span>
              </button>

              <button
                onClick={() => router.push('/accounting/reports')}
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-3 bg-yellow-100 rounded-lg mb-2">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Reports</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Journal Entries */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Journal Entries</h3>
          </div>
          <div className="p-6">
            {summary.recentEntries.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No journal entries</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new journal entry.</p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/accounting/journal-entries/new')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Journal Entry
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.recentEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.entry_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(entry.entry_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="max-w-xs truncate">{entry.narration}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(entry.total_debit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(entry.total_credit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            entry.status === 'posted' ? 'bg-green-100 text-green-800' : 
                            entry.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default AccountingDashboard