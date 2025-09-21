// hooks/usePermissions.js
import { useMemo } from 'react'
import { useAuth } from './useAuth'

export const usePermissions = () => {
  const { userProfile, company } = useAuth()

  const permissions = useMemo(() => {
    if (!userProfile || !company) {
      return {
        canCreateInvoice: false,
        canEditInvoice: false,
        canDeleteInvoice: false,
        canViewReports: false,
        canManageUsers: false,
        canManageCompany: false,
        canAccessAccounting: false,
        canManageInventory: false
      }
    }

    const isAdmin = userProfile.role === 'admin'
    const isWorkforce = userProfile.role === 'workforce'

    return {
      canCreateInvoice: isAdmin || isWorkforce,
      canEditInvoice: isAdmin,
      canDeleteInvoice: isAdmin,
      canViewReports: isAdmin,
      canManageUsers: isAdmin,
      canManageCompany: isAdmin,
      canAccessAccounting: isAdmin,
      canManageInventory: isAdmin,
      canCreateCustomer: isAdmin || isWorkforce,
      canEditCustomer: isAdmin,
      canDeleteCustomer: isAdmin,
      canCreateVendor: isAdmin,
      canEditVendor: isAdmin,
      canDeleteVendor: isAdmin,
      canManageGST: isAdmin,
      canViewDashboard: true,
      isAdmin,
      isWorkforce
    }
  }, [userProfile, company])

  const hasPermission = (permission) => {
    return permissions[permission] || false
  }

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => permissions[permission])
  }

  const hasAllPermissions = (permissionList) => {
    return permissionList.every(permission => permissions[permission])
  }

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  }
}

export default usePermissions