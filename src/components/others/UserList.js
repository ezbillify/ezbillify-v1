import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast'

const UserList = ({ onEdit, onAdd }) => {
  const { company, user } = useAuth()
  const { success, error } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'workforce', label: 'Workforce' }
  ]

  useEffect(() => {
    fetchUsers()
  }, [company?.id])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', company?.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId) => {
    try {
      // Check if trying to delete own account
      if (userId === user.id) {
        error('Cannot delete your own account')
        return
      }

      // Check if this is the last admin
      const adminUsers = users.filter(u => u.role === 'admin' && u.id !== userId)
      if (adminUsers.length === 0 && users.find(u => u.id === userId)?.role === 'admin') {
        error('Cannot delete the last admin user')
        return
      }

      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (deleteError) throw deleteError

      success('User deleted successfully')
      fetchUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      error('Failed to delete user')
    }
    setDeleteConfirm(null)
  }

  const toggleUserStatus = async (targetUser) => {
    try {
      // Check if trying to deactivate own account
      if (targetUser.id === user.id && targetUser.is_active) {
        error('Cannot deactivate your own account')
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: !targetUser.is_active })
        .eq('id', targetUser.id)

      if (updateError) throw updateError

      success(
        `User ${!targetUser.is_active ? 'activated' : 'deactivated'} successfully`
      )
      fetchUsers()
    } catch (err) {
      console.error('Error updating user status:', err)
      error('Failed to update user status')
    }
  }

  const filteredUsers = users.filter(targetUser => {
    const fullName = `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim()
    const matchesSearch = 
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      targetUser.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === '' || targetUser.role === filterRole
    
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role) => {
    const roleColors = {
      admin: 'bg-red-100 text-red-800',
      workforce: 'bg-blue-100 text-blue-800'
    }
    
    const roleLabels = {
      admin: 'Admin',
      workforce: 'Workforce'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}>
        {roleLabels[role] || role}
      </span>
    )
  }

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never'
    
    const date = new Date(lastLogin)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  const adminCount = users.filter(u => u.role === 'admin').length
  const workforceCount = users.filter(u => u.role === 'workforce').length
  const activeUsers = users.filter(u => u.is_active).length

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name or phone..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {roleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* User Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Users</div>
          <div className="text-2xl font-semibold text-gray-900">{users.length}</div>
          <div className="text-sm text-gray-600">{activeUsers} active</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Admins</div>
          <div className="text-2xl font-semibold text-red-600">{adminCount}</div>
          <div className="text-sm text-gray-600">Full access</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Workforce</div>
          <div className="text-2xl font-semibold text-blue-600">{workforceCount}</div>
          <div className="text-sm text-gray-600">Field users</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Recent Logins</div>
          <div className="text-lg font-semibold text-gray-900">
            {users.filter(u => {
              if (!u.last_login) return false
              const diffInHours = (new Date() - new Date(u.last_login)) / (1000 * 60 * 60)
              return diffInHours < 24
            }).length}
          </div>
          <div className="text-sm text-gray-600">Last 24 hours</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
        </div>
        
        <div className="p-6">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                {users.length === 0 ? 'No users found' : 'No users match your search'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((targetUser) => (
                    <tr key={targetUser.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {targetUser.first_name?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">
                              {`${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || 'Unnamed User'}
                              {targetUser.id === user.id && (
                                <span className="ml-2 text-xs text-blue-600">(You)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{targetUser.phone || 'No phone'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(targetUser.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatLastLogin(targetUser.last_login)}
                        {targetUser.login_count > 0 && (
                          <div className="text-xs text-gray-400">
                            {targetUser.login_count} login{targetUser.login_count !== 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          targetUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {targetUser.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {/* Only allow editing workforce users, or admin editing their own profile */}
                        {(targetUser.role === 'workforce' || targetUser.id === user.id) && (
                          <button
                            onClick={() => onEdit(targetUser)}
                            className="text-blue-600 hover:text-blue-700 px-2 py-1"
                          >
                            Edit
                          </button>
                        )}
                        
                        {/* Only allow status toggle for non-self users */}
                        {targetUser.id !== user.id && (
                          <button
                            onClick={() => toggleUserStatus(targetUser)}
                            className={`px-2 py-1 ${targetUser.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                          >
                            {targetUser.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                        
                        {/* Only allow deleting workforce users */}
                        {targetUser.role === 'workforce' && targetUser.id !== user.id && (
                          <button
                            onClick={() => setDeleteConfirm(targetUser)}
                            className="text-red-600 hover:text-red-700 px-2 py-1"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">Delete User</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete "{deleteConfirm.first_name} {deleteConfirm.last_name}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">User Management Rules</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <div>• Only workforce users can be added through this interface</div>
          <div>• Admin users have full system access</div>
          <div>• Workforce users can only access mobile features</div>
          <div>• You cannot delete the last admin user</div>
          <div>• You cannot delete or deactivate your own account</div>
        </div>
      </div>
    </div>
  )
}

export default UserList