// src/components/auth/AuthGuard.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'

const AuthGuard = ({ children, requireCompany = false, requireAdmin = false }) => {
  const { 
    user, 
    userProfile, 
    company, 
    loading, 
    initializing,
    isAuthenticated, 
    hasCompany, 
    isAdmin 
  } = useAuth()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    // Don't check auth until initialization is complete
    if (initializing) return

    const checkAuth = () => {
      const publicRoutes = [
        '/',
        '/login', 
        '/register', 
        '/forgot-password', 
        '/reset-password',
        '/verify-email'
      ]
      
      const isPublicRoute = publicRoutes.includes(router.pathname)

      // If it's a public route, allow access
      if (isPublicRoute) {
        setAuthorized(true)
        return
      }

      // Check if user is authenticated
      if (!isAuthenticated) {
        router.push('/login')
        return
      }

      // Check if company is required but user doesn't have one
      if (requireCompany && !hasCompany) {
        router.push('/setup')
        return
      }

      // Check if admin role is required
      if (requireAdmin && !isAdmin) {
        router.push('/dashboard') // Redirect to dashboard if not admin
        return
      }

      // If user has company but tries to access setup, redirect to dashboard
      if (hasCompany && router.pathname === '/setup') {
        router.push('/dashboard')
        return
      }

      // If user doesn't have company and tries to access protected routes
      if (!hasCompany && router.pathname !== '/setup') {
        router.push('/setup')
        return
      }

      setAuthorized(true)
    }

    checkAuth()
  }, [
    user, 
    userProfile, 
    company, 
    router.pathname, 
    initializing,
    isAuthenticated, 
    hasCompany, 
    isAdmin,
    requireCompany,
    requireAdmin
  ])

  // Show loading spinner during initialization or auth checks
  if (initializing || loading || !authorized) {
    return <LoadingScreen />
  }

  return children
}

// Loading screen component
const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EzBillify</h1>
          <p className="text-gray-600">India's Best Billing Software</p>
        </div>

        {/* Loading animation */}
        <div className="flex justify-center items-center space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        
        <p className="text-gray-500 mt-4">Loading...</p>
      </div>
    </div>
  )
}

// HOC for pages that require authentication
export const withAuth = (WrappedComponent, options = {}) => {
  const AuthenticatedComponent = (props) => {
    return (
      <AuthGuard {...options}>
        <WrappedComponent {...props} />
      </AuthGuard>
    )
  }

  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return AuthenticatedComponent
}

// HOC for pages that require company setup
export const withCompany = (WrappedComponent) => {
  return withAuth(WrappedComponent, { requireCompany: true })
}

// HOC for pages that require admin access
export const withAdmin = (WrappedComponent) => {
  return withAuth(WrappedComponent, { requireCompany: true, requireAdmin: true })
}

export default AuthGuard
