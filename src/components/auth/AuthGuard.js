// src/components/auth/AuthGuard.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import WorkforceAccessDenied from './WorkforceAccessDenied'

const AuthGuard = ({ children, requireCompany = false, requireAdmin = false }) => {
  const { 
    user, 
    userProfile, 
    company, 
    loading, 
    initialized,
    isAuthenticated, 
    hasCompany, 
    isAdmin,
    isWorkforce 
  } = useAuth()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [showWorkforceBlock, setShowWorkforceBlock] = useState(false)

  useEffect(() => {
    // Don't check auth until initialization is complete
    if (!initialized) {
      setIsReady(false)
      return
    }

    const checkAuth = async () => {
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
        // But if user is authenticated and has company, redirect to dashboard
        if (isAuthenticated && hasCompany && router.pathname !== '/') {
          router.replace('/dashboard')
          return
        }
        setIsReady(true)
        return
      }

      // Check if user is authenticated
      if (!isAuthenticated) {
        router.replace('/login')
        return
      }

      // 🔒 WORKFORCE RESTRICTION: Block workforce users from web application
      if (isAuthenticated && isWorkforce) {
        console.log('AuthGuard - Workforce user detected, blocking web access')
        setShowWorkforceBlock(true)
        setIsReady(true)
        return
      }

      // Check if company is required but user doesn't have one
      if (requireCompany && !hasCompany) {
        router.replace('/setup')
        return
      }

      // Check if admin role is required
      if (requireAdmin && !isAdmin) {
        router.replace('/dashboard')
        return
      }

      // Handle setup page logic
      if (router.pathname === '/setup') {
        if (hasCompany) {
          router.replace('/dashboard')
          return
        }
        setIsReady(true)
        return
      }

      // For all other protected routes, ensure user has company
      if (!hasCompany && router.pathname !== '/setup') {
        router.replace('/setup')
        return
      }

      setIsReady(true)
    }

    checkAuth()
  }, [
    initialized,
    isAuthenticated, 
    hasCompany, 
    isAdmin,
    isWorkforce,
    router.pathname,
    requireCompany,
    requireAdmin
  ])

  // Show loading screen while auth is initializing or during redirects
  if (!initialized || loading || !isReady) {
    return <LoadingScreen />
  }

  // 🔒 Show workforce access denied screen
  if (showWorkforceBlock) {
    return <WorkforceAccessDenied autoLogout={true} countdown={5} />
  }

  return children
}

// Enhanced Loading screen component
const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EzBillify</h1>
          <p className="text-gray-600">India's Best Billing Software</p>
        </div>

        {/* Enhanced Loading animation */}
        <div className="flex justify-center items-center space-x-2 mb-4">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        
        <p className="text-gray-500">Checking authentication...</p>
        
        {/* Progress bar */}
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto mt-4">
          <div className="h-full bg-blue-600 rounded-full animate-pulse"></div>
        </div>
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