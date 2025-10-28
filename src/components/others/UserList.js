import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast'
import Button from '../shared/ui/Button'
import Input from '../shared/ui/Input'
import Select from '../shared/ui/Select'
import Badge from '../shared/ui/Badge'
import Table from '../shared/ui/Table'
import { TableHead, TableBody, TableRow, TableCell, TableHeader } from '../shared/ui/Table'

const UserList = ({ onEdit, onAdd, isAdmin }) => {
  const { company, user, userProfile } = useAuth()
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
      
      // Debug logging
      console.log('UserList - Fetching users with:', { 
        companyId: company?.id, 
        userId: user?.id, 
        userRole: userProfile?.role 
      })
      
      // If no company ID, show a message
      if (!company?.id) {
        console.log('UserList - No company ID found')
        setUsers([])
        setLoading(false)
        return
      }
      
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      // Get all users in the company via API endpoint with auth token
      const response = await fetch(`/api/settings/users?company_id=${company?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }
      
      const result = await response.json()
      const usersData = result.data || []
      
      console.log('UserList - Users fetched:', usersData.length, usersData)
      
      setUsers(usersData)
    } catch (err) {
      console.error('UserList - Error fetching users:', err)
      error('Failed to load users: ' + err.message)
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

      // Use API endpoint for proper user deletion
      const response = await fetch('/api/settings/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          company_id: company?.id
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

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

      // Use API endpoint for updating user
      const response = await fetch(`/api/settings/users?user_id=${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !targetUser.is_active
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user status')
      }

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
      targetUser.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      targetUser.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
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

  // If no company ID, show a message
  if (!company?.id) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            No company information available. Please contact your administrator.
          </div>
        </div>
      </div>
    )
  }

  const adminCount = users.filter(u => u.role === 'admin').length
  const workforceCount = users.filter(u => u.role === 'workforce').length
  const activeUsers = users.filter(u => u.is_active).length

  return (
    <div className="space-y-6 px-2">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users..."
            size="sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-32">
            <Select
              value={filterRole}
              onChange={setFilterRole}
              options={roleOptions}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* User Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
          <div className="text-xs font-medium text-blue-700">Total Users</div>
          <div className="text-xl font-bold text-blue-900 mt-1">{users.length}</div>
          <div className="text-xs text-blue-600 mt-1">{activeUsers} active</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg border border-red-200">
          <div className="text-xs font-medium text-red-700">Admins</div>
          <div className="text-xl font-bold text-red-900 mt-1">{adminCount}</div>
          <div className="text-xs text-red-600 mt-1">Full access</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 rounded-lg border border-indigo-200">
          <div className="text-xs font-medium text-indigo-700">Workforce</div>
          <div className="text-xl font-bold text-indigo-900 mt-1">{workforceCount}/2</div>
          <div className="text-xs text-indigo-600 mt-1">Field users</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
          <div className="text-xs font-medium text-green-700">Recent Logins</div>
          <div className="text-xl font-bold text-green-900 mt-1">
            {users.filter(u => {
              if (!u.last_login) return false
              const diffInHours = (new Date() - new Date(u.last_login)) / (1000 * 60 * 60)
              return diffInHours < 24
            }).length}
          </div>
          <div className="text-xs text-green-600 mt-1">Last 24 hours</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-medium text-gray-900">Team Members</h3>
          <div className="text-xs text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>
        
        <div className="p-4">
          {users.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">No team members</h3>
              <div className="text-gray-500 text-sm mb-4">
                Get started by adding your first user to your team.
              </div>
              {isAdmin && (
                <div className="text-xs text-gray-500">
                  Use the "Add User" button in the header above
                </div>
              )}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.1-5.291-2.709M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">No matching users</h3>
              <div className="text-gray-500 text-sm mb-4">
                No users match your search criteria.
              </div>
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setFilterRole('')
                }}
                variant="outline"
                size="sm"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader className="px-4 py-2 text-xs">User</TableHeader>
                  <TableHeader className="px-4 py-2 text-xs">Role</TableHeader>
                  <TableHeader className="px-4 py-2 text-xs">Contact</TableHeader>
                  <TableHeader className="px-4 py-2 text-xs">Last Login</TableHeader>
                  <TableHeader className="px-4 py-2 text-xs">Status</TableHeader>
                  <TableHeader className="px-4 py-2 text-xs">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((targetUser) => (
                  <TableRow key={targetUser.id}>
                    <TableCell className="px-4 py-2">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {targetUser.first_name?.[0]?.toUpperCase() || targetUser.email?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-sm text-gray-900">
                            {`${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || 'Unnamed User'}
                            {targetUser.id === user.id && (
                              <Badge variant="primary" size="xs" className="ml-1">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{targetUser.email || 'No email'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge 
                        variant={targetUser.role === 'admin' ? 'danger' : 'primary'} 
                        size="xs"
                      >
                        {targetUser.role === 'admin' ? 'Admin' : 'Workforce'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="text-xs text-gray-500">
                        {targetUser.phone || 'No phone'}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="text-xs text-gray-500">
                        {formatLastLogin(targetUser.last_login)}
                      </div>
                      {targetUser.login_count > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {targetUser.login_count} login{targetUser.login_count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge 
                        variant={targetUser.is_active ? 'success' : 'default'} 
                        size="xs"
                      >
                        {targetUser.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex space-x-1">
                        {/* Only allow editing workforce users, or admin editing their own profile */}
                        {(targetUser.role === 'workforce' || targetUser.id === user.id) && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onEdit(targetUser)}
                          >
                            Edit
                          </Button>
                        )}
                        
                        {/* Only allow status toggle for non-self users */}
                        {targetUser.id !== user.id && (
                          <Button
                            variant={targetUser.is_active ? 'warning' : 'success'}
                            size="xs"
                            onClick={() => toggleUserStatus(targetUser)}
                          >
                            {targetUser.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                        
                        {/* Only allow deleting workforce users */}
                        {targetUser.role === 'workforce' && targetUser.id !== user.id && (
                          <Button
                            variant="danger"
                            size="xs"
                            onClick={() => setDeleteConfirm(targetUser)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          <div>• Only workforce users can be added through this interface (max 2 per company)</div>
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