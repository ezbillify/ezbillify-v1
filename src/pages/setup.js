// src/pages/setup.js
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthContext'
import CompanySetup from '../components/auth/CompanySetup'
import Head from 'next/head'

const SetupPage = () => {
  const { user, company, loading, initializing } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect logic after loading is complete
    if (!initializing && !loading) {
      // If not authenticated, redirect to login
      if (!user) {
        console.log('No user found, redirecting to login')
        router.push('/login')
        return
      }

      // If user already has a company, redirect to dashboard
      if (company) {
        console.log('User has company, redirecting to dashboard')
        router.push('/dashboard')
        return
      }

      console.log('User authenticated but no company, showing setup')
    }
  }, [user, company, loading, initializing, router])

  // Show loading while checking auth state
  if (initializing || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if user is not authenticated (will redirect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Don't render if user already has company (will redirect)
  if (company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  // Render the setup page
  return (
    <>
      <Head>
        <title>Company Setup - EzBillify</title>
        <meta name="description" content="Set up your company profile to start using EzBillify" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <CompanySetup />
    </>
  )
}

export default SetupPage