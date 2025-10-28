// pages/debug/database-check.js
import { useState } from 'react'
import { supabase } from '../../services/utils/supabase'

export default function DatabaseCheckPage() {
  const [userId, setUserId] = useState('')
  const [userData, setUserData] = useState(null)
  const [usersData, setUsersData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const checkUserById = async () => {
    if (!userId) {
      setError('Please enter a user ID')
      return
    }
    
    setLoading(true)
    setError('')
    setUserData(null)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError
      setUserData(data)
    } catch (err) {
      setError('Error fetching user: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkAllUsers = async () => {
    setLoading(true)
    setError('')
    setUsersData(null)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setUsersData(data)
    } catch (err) {
      setError('Error fetching users: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Database User Check</h1>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Check Specific User</h2>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter User ID (UUID)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={checkUserById}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check User'}
              </button>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {userData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">User Found</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <p><span className="font-medium">ID:</span> {userData.id}</p>
                  <p><span className="font-medium">Role:</span> {userData.role}</p>
                  <p><span className="font-medium">First Name:</span> {userData.first_name || 'Not set'}</p>
                  <p><span className="font-medium">Last Name:</span> {userData.last_name || 'Not set'}</p>
                  <p><span className="font-medium">Company ID:</span> {userData.company_id || 'Not set'}</p>
                  <p><span className="font-medium">Is Active:</span> {userData.is_active ? 'Yes' : 'No'}</p>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">All Users</h2>
              <button
                onClick={checkAllUsers}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load All Users'}
              </button>
            </div>
            
            {usersData && (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-2 px-4 border-b text-left">ID</th>
                      <th className="py-2 px-4 border-b text-left">Name</th>
                      <th className="py-2 px-4 border-b text-left">Role</th>
                      <th className="py-2 px-4 border-b text-left">Company ID</th>
                      <th className="py-2 px-4 border-b text-left">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4 border-b text-sm">{user.id.substring(0, 8)}...</td>
                        <td className="py-2 px-4 border-b text-sm">
                          {user.first_name} {user.last_name}
                        </td>
                        <td className="py-2 px-4 border-b text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b text-sm">{user.company_id?.substring(0, 8) || 'N/A'}</td>
                        <td className="py-2 px-4 border-b text-sm">
                          {user.is_active ? 'Yes' : 'No'}
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
    </div>
  )
}