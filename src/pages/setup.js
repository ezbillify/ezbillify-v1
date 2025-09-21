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
        router.push('/login')
        return
      }

      // If user already has a company, redirect to dashboard
      if (company) {
        router.push('/dashboard')
        return
      }
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
    return null
  }

  // Don't render if user already has company (will redirect)
  if (company) {
    return null
  }

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

// Protect this page - only authenticated users without companies
SetupPage.requireAuth = true
SetupPage.requireNoCompany = true

export default SetupPage