// pages/debug/user-profile-debug.js
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/utils/supabase'

export default function UserProfileDebug() {
  const { user, userProfile, company, isAdmin, isWorkforce } = useAuth()
  const [debugInfo, setDebugInfo] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        console.log('Debug - Auth context:', { user, userProfile, company })
        
        // Fetch user's own profile directly
        let ownProfile = null
        if (user?.id) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (!error) {
            // Fetch email for own profile
            try {
              const { data: authUserData, error: authError } = await supabase
                .from('auth.users')
                .select('email')
                .eq('id', user.id)
                .single()
              
              if (!authError) {
                ownProfile = { ...data, email: authUserData?.email || null }
              } else {
                ownProfile = { ...data, email: null }
              }
            } catch (emailError) {
              console.error('Error fetching email for own profile:', emailError)
              ownProfile = { ...data, email: null }
            }
          }
          console.log('Debug - Own profile:', { data, error })
        }
        
        // Fetch company users
        let companyUsers = []
        if (company?.id) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('company_id', company.id)
          
          if (!error) {
            // For each user, fetch their email from auth.users
            companyUsers = await Promise.all(data?.map(async (user) => {
              try {
                const { data: authUserData, error: authError } = await supabase
                  .from('auth.users')
                  .select('email')
                  .eq('id', user.id)
                  .single()
                
                if (authError) {
                  console.error('Error fetching auth user data:', authError)
                  return { ...user, email: null }
                }
                
                return { ...user, email: authUserData?.email || null }
              } catch (err) {
                console.error('Error fetching email for user:', user.id, err)
                return { ...user, email: null }
              }
            })) || []
          }
          console.log('Debug - Company users:', { data, error })
        }
        
        setDebugInfo({
          authUser: user,
          userProfile,
          company,
          isAdmin,
          isWorkforce,
          ownProfile,
          companyUsers
        })
        
        setUsers(companyUsers || [])
      } catch (error) {
        console.error('Debug - Error:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDebugInfo()
  }, [user, userProfile, company])

  if (loading) {
    return <div className="p-6">Loading debug information...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Profile Debug</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Auth Context Information</h2>
        <div className="space-y-2">
          <div><strong>User ID:</strong> {user?.id || 'Not available'}</div>
          <div><strong>User Email:</strong> {user?.email || 'Not available'}</div>
          <div><strong>User Profile:</strong> {userProfile ? 'Available' : 'Not available'}</div>
          <div><strong>Company:</strong> {company ? 'Available' : 'Not available'}</div>
          <div><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</div>
          <div><strong>Is Workforce:</strong> {isWorkforce ? 'Yes' : 'No'}</div>
        </div>
      </div>
      
      {debugInfo?.ownProfile && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Own Profile</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(debugInfo.ownProfile, null, 2)}
          </pre>
        </div>
      )}
      
      {debugInfo?.company && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Company Information</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(debugInfo.company, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Company Users ({users.length})</h2>
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.first_name} {user.last_name}
                      {debugInfo?.authUser?.id === user.id && (
                        <span className="ml-2 text-xs text-blue-600">(You)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.email || 'No email'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No users found in this company
          </div>
        )}
      </div>
    </div>
  )
}