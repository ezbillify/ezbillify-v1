// src/components/auth/WorkforceAccessDenied.js
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
// import Image from 'next/image'

const WorkforceAccessDenied = ({ autoLogout = true, countdown = 5 }) => {
  const { signOut, getUserDisplayName } = useAuth()
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(countdown)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const logoutCalledRef = useRef(false)

  // Define handleLogout BEFORE useEffect that uses it
  const handleLogout = useCallback(async () => {
    if (logoutCalledRef.current) {
      console.log('WorkforceAccessDenied - Logout already in progress, skipping')
      return
    }
    
    logoutCalledRef.current = true
    console.log('WorkforceAccessDenied - Logging out workforce user')
    setIsLoggingOut(true)
    
    try {
      await signOut()
      console.log('WorkforceAccessDenied - Signout successful, redirecting to login')
    } catch (error) {
      console.error('WorkforceAccessDenied - Logout error:', error)
    } finally {
      // Always redirect regardless of signOut success/failure
      console.log('WorkforceAccessDenied - Performing redirect to /login')
      window.location.href = '/login'
    }
  }, [signOut])

  useEffect(() => {
    if (!autoLogout) return

    console.log('WorkforceAccessDenied - Starting auto-logout timer:', countdown, 'seconds')

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        console.log('WorkforceAccessDenied - Time left:', prev - 1, 'seconds')
        
        if (prev <= 1) {
          console.log('WorkforceAccessDenied - Timer reached 0, triggering logout')
          clearInterval(timer)
          handleLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      console.log('WorkforceAccessDenied - Cleaning up timer')
      clearInterval(timer)
    }
  }, [autoLogout, handleLogout, countdown])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-30" style={{ willChange: 'transform' }}>
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-orange-400 to-red-500 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity' }}></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-red-400 to-pink-500 rounded-full blur-3xl animate-pulse delay-1000" style={{ willChange: 'opacity' }}></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-2xl animate-pulse delay-500" style={{ willChange: 'opacity' }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full">
          {/* Main Card */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-10 text-center">
            {/* Logo */}
            <div className="mb-8">
              <div className="w-20 h-20 relative mx-auto mb-4">
                <img
                  src="/ezbillifyfavicon.png"
                  alt="EzBillify Logo"
                  width="80"
                  height="80"
                  className="rounded-xl shadow-lg"
                  priority
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                EzBillify
              </h1>
            </div>

            {/* Warning Icon */}
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Main Message */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Web Access Restricted
              </h2>
              <p className="text-lg text-gray-700 mb-4">
                Hello <span className="font-semibold text-blue-600">{getUserDisplayName()}</span>!
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                This web application is designed exclusively for <span className="font-semibold text-gray-900">Admin users</span>.
              </p>
              <p className="text-gray-600 leading-relaxed">
                As a <span className="font-semibold text-orange-600">Workforce user</span>, please use the mobile application to access your account and continue your work.
              </p>
            </div>

            {/* Mobile App Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-gray-900">
                    Download EzBillify Mobile App
                  </h3>
                  <p className="text-sm text-gray-600">
                    Available on iOS and Android
                  </p>
                </div>
              </div>

              {/* App Store Buttons Placeholder */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                <div className="flex items-center justify-center px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer">
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">Download on the</div>
                    <div className="text-sm font-semibold">App Store</div>
                  </div>
                </div>
                <div className="flex items-center justify-center px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer">
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">GET IT ON</div>
                    <div className="text-sm font-semibold">Google Play</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-logout Timer */}
            {autoLogout && (
              <div className="mb-6">
                <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200 rounded-xl">
                  <svg className="w-5 h-5 text-orange-600 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-orange-800 font-medium">
                    {isLoggingOut ? (
                      "Logging out..."
                    ) : (
                      <>
                        Auto-logout in <span className="font-bold text-orange-600 text-xl mx-1">{timeLeft}</span> seconds
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Manual Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
            >
              {isLoggingOut ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Logging out...
                </div>
              ) : (
                "Logout Now"
              )}
            </button>

            {/* Help Text */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Need help? Contact your administrator or visit our{' '}
                <a href="/support" className="text-blue-600 hover:text-blue-700 font-medium underline">
                  support page
                </a>
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} EzBillify Technologies. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkforceAccessDenied
