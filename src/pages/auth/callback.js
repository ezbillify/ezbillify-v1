// src/pages/auth/callback.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../services/utils/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('Verifying your email...')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash from the URL (Supabase uses hash fragments)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        // Check if this is an email confirmation
        if (type === 'signup' || type === 'email') {
          if (accessToken && refreshToken) {
            // Set the session with the tokens
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })

            if (error) {
              console.error('Error setting session:', error)
              setStatus('error')
              setMessage('Failed to verify email. Please try again or contact support.')
              return
            }

            // Success!
            setStatus('success')
            setMessage('Email verified successfully! You can now login with your credentials.')

            // Start countdown to redirect
            const timer = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(timer)
                  router.push('/login')
                  return 0
                }
                return prev - 1
              })
            }, 1000)

            return () => clearInterval(timer)
          } else {
            setStatus('error')
            setMessage('Invalid verification link. Please request a new verification email.')
          }
        } else {
          // Handle other auth types if needed
          setStatus('error')
          setMessage('Invalid authentication type.')
        }
      } catch (error) {
        console.error('Error in auth callback:', error)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-indigo-400 to-pink-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
            <div className="text-center space-y-6">
              {/* Status Icon */}
              <div className="flex justify-center">
                {status === 'verifying' && (
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                  </div>
                )}

                {status === 'success' && (
                  <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center animate-bounce">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {status === 'error' && (
                  <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Status Title */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {status === 'verifying' && 'Verifying Email'}
                  {status === 'success' && 'Email Verified!'}
                  {status === 'error' && 'Verification Failed'}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {message}
                </p>
              </div>

              {/* Success - Show countdown */}
              {status === 'success' && (
                <div className="pt-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                    <p className="text-green-700 text-sm">
                      Redirecting to login page in <span className="font-bold">{countdown}</span> seconds...
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300"
                  >
                    Go to Login Now
                  </button>
                </div>
              )}

              {/* Error - Show retry button */}
              {status === 'error' && (
                <div className="pt-4 space-y-3">
                  <button
                    onClick={() => router.push('/verify-email')}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300"
                  >
                    Request New Verification Email
                  </button>
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full bg-white text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300"
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Help Text */}
          {status === 'error' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Need help? Contact support for assistance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
