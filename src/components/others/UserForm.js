import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast'

const UserForm = ({ user: editUser = null, onSave, onCancel }) => {
  const { company, user: currentUser } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: editUser?.first_name || '',
    last_name: editUser?.last_name || '',
    email: editUser?.email || '',
    phone: editUser?.phone || '',
    password: '',
    confirm_password: '',
    role: editUser?.role || 'workforce',
    is_active: editUser?.is_active ?? true,
    permissions: editUser?.permissions || {}
  })

  const [errors, setErrors] = useState({})

  // Only workforce users can be created, admins can edit their own profile
  const isEditingSelf = editUser?.id === currentUser?.id
  const canChangeRole = currentUser?.role === 'admin' && !isEditingSelf

  const workforcePermissions = [
    { 
      key: 'can_view_inventory', 
      label: 'View Inventory', 
      description: 'Can view stock levels and item details' 
    },
    { 
      key: 'can_update_inventory', 
      label: 'Update Inventory', 
      description: 'Can add/remove stock and adjust quantities' 
    },
    { 
      key: 'can_create_sales', 
      label: 'Create Sales', 
      description: 'Can create quotations and invoices' 
    },
    { 
      key: 'can_view_customers', 
      label: 'View Customers', 
      description: 'Can access customer information' 
    },
    { 
      key: 'can_create_customers', 
      label: 'Create Customers', 
      description: 'Can add new customers' 
    },
    { 
      key: 'can_scan_barcodes', 
      label: 'Barcode Scanning', 
      description: 'Can scan items and update inventory' 
    }
  ]

  const validateForm = () => {
    const newErrors = {}

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    }

    if (!editUser) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format'
      }

      if (!formData.password) {
        newErrors.password = 'Password is required'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      }

      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match'
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const checkUserLimit = async () => {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company?.id)
        .eq('role', 'workforce')

      if (error) throw error
      
      // Allow up to 2 workforce users
      return count < 2
    } catch (err) {
      console.error('Error checking user limit:', err)
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      error('Please fix the form errors')
      return
    }

    setLoading(true)
    
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('No authentication token found')
      }

      // For new workforce users, we need to create both auth user and profile
      if (!editUser) {
        // Check user limit for new workforce users
        const withinLimit = await checkUserLimit()
        if (!withinLimit) {
          error('Maximum of 2 workforce users allowed per company')
          setLoading(false)
          return
        }

        // Create user via API endpoint with auth token
        const response = await fetch('/api/settings/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            company_id: company?.id,
            email: formData.email,
            password: formData.password,
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            phone: formData.phone.trim(),
            role: 'workforce', // Always workforce for new users
            permissions: formData.permissions,
            is_active: true
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create user')
        }

        success('Workforce user created successfully')
        onSave?.(result.data)
      } else {
        // Update existing user via API endpoint with auth token
        const response = await fetch(`/api/settings/users?user_id=${editUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            phone: formData.phone.trim(),
            permissions: formData.permissions,
            is_active: formData.is_active,
            // Only allow role changes for non-self edits by admins
            ...(canChangeRole && { role: formData.role })
          })
        })

        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update user')
        }

        success('User updated successfully')
        onSave?.(result.data)
      }
    } catch (err) {
      console.error('Error saving user:', err)
      error(err.message || 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handlePermissionChange = (permissionKey, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionKey]: checked
      }
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {editUser ? (isEditingSelf ? 'Edit Your Profile' : 'Edit User') : 'Add Workforce User'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {editUser ? 'Update user information and permissions' : 'Create a new workforce user account'}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 border-b pb-2">Basic Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.first_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter first name"
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.last_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter last name"
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                  )}
                </div>

                {!editUser && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.email ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="user@company.com"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => handleChange('password', e.target.value)}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.password ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Enter password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirm_password}
                          onChange={(e) => handleChange('confirm_password', e.target.value)}
                          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.confirm_password ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Confirm password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {errors.confirm_password && (
                        <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="+91 98765 43210"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>

                {/* Role Selection - Only for admins editing others */}
                {canChangeRole && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleChange('role', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="workforce">Workforce</option>
                    </select>
                  </div>
                )}

                {/* Status Toggle - Only for existing users, not self */}
                {editUser && !isEditingSelf && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => handleChange('is_active', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600">User is active</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Permissions - Only for workforce users */}
            {(formData.role === 'workforce' || (!editUser && !isEditingSelf)) && (
              <div className="space-y-4 mt-6">
                <h4 className="font-medium text-gray-900 border-b pb-2">Workforce Permissions</h4>
                <p className="text-sm text-gray-500">Select which features this user can access</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {workforcePermissions.map((permission) => (
                    <div key={permission.key} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.permissions[permission.key] || false}
                        onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <label className="text-sm font-medium text-gray-700">
                          {permission.label}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Cards */}
            <div className="space-y-4 mt-6">
              {!editUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">New User Setup</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• New users will be created with workforce role</div>
                    <div>• They will receive login credentials separately</div>
                    <div>• Default permissions can be modified after creation</div>
                    <div>• Mobile app access will be automatically configured</div>
                  </div>
                </div>
              )}

              {formData.role === 'workforce' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Workforce Features</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>• Mobile-first interface for field operations</div>
                    <div>• Barcode scanning for inventory management</div>
                    <div>• Real-time data sync with main system</div>
                    <div>• Location-based features and tracking</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 border-t border-gray-200 bg-white sticky bottom-0">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? 'Saving...' : (editUser ? 'Update User' : 'Create User')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserForm