import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast'

const UserForm = ({ user: editUser = null, onSave, onCancel }) => {
  const { company, user: currentUser } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: editUser?.first_name || '',
    last_name: editUser?.last_name || '',
    phone: editUser?.phone || '',
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

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      error('Please fix the form errors')
      return
    }

    setLoading(true)
    
    try {
      // For new workforce users, we need to create both auth user and profile
      if (!editUser) {
        // This would typically involve creating a Supabase auth user
        // For now, we'll create a placeholder entry
        const tempUserId = crypto.randomUUID()
        
        const userData = {
          id: tempUserId, // In real implementation, this would come from Supabase Auth
          company_id: company?.id,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          role: 'workforce', // Always workforce for new users
          permissions: formData.permissions,
          is_active: true,
          login_count: 0
        }

        const { data, error: insertError } = await supabase
          .from('users')
          .insert([userData])
          .select()

        if (insertError) throw insertError

        success('Workforce user created successfully')
        onSave?.(data[0])
      } else {
        // Update existing user
        const updateData = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          permissions: formData.permissions,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        }

        // Only allow role changes for non-self edits by admins
        if (canChangeRole) {
          updateData.role = formData.role
        }

        const { data, error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editUser.id)
          .select()

        if (updateError) throw updateError

        success('User updated successfully')
        onSave?.(data[0])
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="pb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {editUser ? (isEditingSelf ? 'Edit Your Profile' : 'Edit User') : 'Add Workforce User'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {editUser ? 'Update user information and permissions' : 'Create a new workforce user account'}
        </p>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Basic Information</h4>
        
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
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Workforce Permissions</h4>
          <p className="text-sm text-gray-500">Select which features this user can access</p>
          
          <div className="space-y-3">
            {workforcePermissions.map((permission) => (
              <div key={permission.key} className="flex items-start">
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
                  <p className="text-xs text-gray-500">{permission.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="space-y-4">
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

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : (editUser ? 'Update User' : 'Create User')}
        </button>
      </div>
    </form>
  )
}

export default UserForm