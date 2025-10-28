// pages/debug/user-test.js
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function UserTestPage() {
  const { user, company } = useAuth()
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchUserInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/user-info')
      const result = await response.json()
      setUserInfo(result)
    } catch (error) {
      console.error('Error fetching user info:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchUserInfo()
    }
  }, [user])

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">User Information Debug</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Auth Context Info</h2>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">User ID:</span> {user?.id || 'Not available'}</p>
                <p><span className="font-medium">User Role:</span> {user?.role || 'Not available'}</p>
                <p><span className="font-medium">Email:</span> {user?.email || 'Not available'}</p>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-green-900 mb-2">Company Info</h2>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Company ID:</span> {company?.id || 'Not available'}</p>
                <p><span className="font-medium">Company Name:</span> {company?.name || 'Not available'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Database User Info</h2>
              <button
                onClick={fetchUserInfo}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            
            {userInfo ? (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Success:</span> {userInfo.success ? 'Yes' : 'No'}</p>
                {userInfo.data && (
                  <>
                    <p><span className="font-medium">Database User ID:</span> {userInfo.data.id}</p>
                    <p><span className="font-medium">Database Role:</span> {userInfo.data.role}</p>
                    <p><span className="font-medium">First Name:</span> {userInfo.data.first_name || 'Not set'}</p>
                    <p><span className="font-medium">Last Name:</span> {userInfo.data.last_name || 'Not set'}</p>
                    <p><span className="font-medium">Company ID:</span> {userInfo.data.company_id}</p>
                    <p><span className="font-medium">Company Name:</span> {userInfo.data.company?.name || 'Not set'}</p>
                    <p><span className="font-medium">Is Active:</span> {userInfo.data.is_active ? 'Yes' : 'No'}</p>
                  </>
                )}
                {userInfo.error && (
                  <p><span className="font-medium">Error:</span> {userInfo.error}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Click "Refresh" to load user information</p>
            )}
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">Troubleshooting Steps</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
              <li>Check if your user role in the database is set to "admin"</li>
              <li>Verify that your company_id is correctly set</li>
              <li>Ensure you're logged in with the correct account</li>
              <li>Try refreshing the page to reload authentication context</li>
              <li>If still not working, contact system administrator to verify your user record</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}