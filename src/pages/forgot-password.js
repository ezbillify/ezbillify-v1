// src/pages/forgot-password.js
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Email address is required')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setError('')
    setMessage('')

    try {
      const result = await resetPassword(email)
      
      if (result.error) {
        setError(result.error)
      } else {
        setMessage(result.message || 'Password reset email sent! Please check your inbox.')
        setEmail('') // Clear email field on success
      }
    } catch (error) {
      setError('Failed to send reset email. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-indigo-400 to-pink-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Panel - Reset Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 lg:px-16">
          <div className="max-w-md mx-auto w-full">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-1 text-gray-900">
                Forgot Password?
              </h2>
              <p className="text-gray-600 mb-8">No worries! Enter your email and we'll send you reset instructions</p>
            </div>

            {/* Reset Form */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 mb-8">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {message && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-green-600 text-sm">{message}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-sm disabled:opacity-50"
                      placeholder="Enter your email address"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 text-sm"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending Reset Link...
                    </div>
                  ) : (
                    "Send Reset Instructions"
                  )}
                </button>
              </form>

              {/* Additional Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">What happens next?</h4>
                    <p className="text-sm text-blue-700">
                      We'll send you a secure link to reset your password. The link will expire in 24 hours for security.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Back to Login */}
            <div className="text-center">
              <p className="text-gray-600">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-teal-500 font-medium hover:underline"
                >
                  Back to Sign In
                </Link>
              </p>
            </div>

            {/* Help */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Still having trouble? Contact our support team for assistance.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Security Illustration */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8">
          <div className="relative w-full max-w-lg">
            {/* Main Security Card */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              {/* Security Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-sm text-gray-500 font-medium">Password Reset</div>
              </div>

              {/* Security Content */}
              <div className="space-y-6 text-center">
                <div>
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Secure Password Reset</h3>
                  <p className="text-gray-600 text-sm">
                    Your account security is our priority. We use industry-standard encryption to protect your data.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3 bg-green-50 rounded-lg p-3">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-green-700">256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-blue-50 rounded-lg p-3">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-blue-700">Secure reset links</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-purple-50 rounded-lg p-3">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-purple-700">24-hour link expiry</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-800">🔒 Protected</div>
                    <div className="text-sm text-gray-600">Your data is safe with us</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl rotate-12 opacity-80 shadow-lg"></div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-r from-pink-400 to-red-500 rounded-xl rotate-45 opacity-80 shadow-lg"></div>
            <div className="absolute top-1/2 -left-6 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg rotate-12 opacity-60 shadow-lg"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
