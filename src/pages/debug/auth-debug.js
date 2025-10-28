// pages/debug/auth-debug.js
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'

export default function AuthDebugPage() {
  const { user, company, initialized, isAdmin } = useAuth()  // Get isAdmin from AuthContext
  const [tabVisibility, setTabVisibility] = useState({})

  // Simulate the tab filtering logic from settings page
  useEffect(() => {
    console.log('Auth Debug:', { user, company, initialized, isAdmin })
    
    const settingsTabs = [
      { id: 'company', label: 'Company Profile', adminOnly: false },
      { id: 'branches', label: 'Branches', adminOnly: false },
      { id: 'numbering', label: 'Document Numbering', adminOnly: false },
      { id: 'users', label: 'User Management', adminOnly: true },
      { id: 'templates', label: 'Print Templates', adminOnly: false },
      { id: 'integrations', label: 'Integrations', adminOnly: false },
      { id: 'veekaart', label: 'VeeKaart Sync', adminOnly: false },
      { id: 'export', label: 'Data Export', adminOnly: false },
      { id: 'audit', label: 'Audit Trail', adminOnly: true }
    ]

    const availableTabs = settingsTabs.filter(tab => {
      if (tab.adminOnly) {
        return isAdmin
      }
      return true
    })

    setTabVisibility({
      isAdmin,
      allTabs: settingsTabs,
      availableTabs: availableTabs.map(t => t.id),
      userTabVisible: availableTabs.some(t => t.id === 'users')
    })
  }, [user, company, initialized, isAdmin])

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Authentication Debug</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Auth Context</h2>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Initialized:</span> {initialized ? 'Yes' : 'No'}</p>
                <p><span className="font-medium">User:</span> {user ? 'Available' : 'Not available'}</p>
                <p><span className="font-medium">Company:</span> {company ? 'Available' : 'Not available'}</p>
                <p><span className="font-medium">Is Admin:</span> {isAdmin ? 'Yes' : 'No'}</p>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-green-900 mb-2">User Details</h2>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">ID:</span> {user?.id || 'N/A'}</p>
                <p><span className="font-medium">Role:</span> {user?.role || 'N/A'}</p>
                <p><span className="font-medium">Email:</span> {user?.email || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Tab Visibility Check</h2>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Is Admin:</span> {tabVisibility.isAdmin ? 'Yes' : 'No'}</p>
              <p><span className="font-medium">User Management Tab Visible:</span> {tabVisibility.userTabVisible ? 'Yes' : 'No'}</p>
              <p><span className="font-medium">Available Tabs:</span> {tabVisibility.availableTabs?.join(', ') || 'None'}</p>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">Raw Data</h2>
            <pre className="text-xs bg-white p-4 rounded overflow-x-auto">
              {JSON.stringify({ user, company, initialized, isAdmin, tabVisibility }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}