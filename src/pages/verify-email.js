// src/pages/verify-email.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'

export default function VerifyEmailPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  useEffect(() => {
    // If user is already authenticated, redirect
    if (!loading && user && user.email_confirmed_at) {
      router.push('/setup')
    }
  }, [user, loading, router])

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendMessage('')

    try {
      // Simulate resend email functionality
      // You can implement actual resend logic here
      setTimeout(() => {
        setResendMessage('Verification email sent! Please check your inbox.')
        setIsResending(false)
      }, 2000)
    } catch (error) {
      setResendMessage('Failed to resend email. Please try again.')
      setIsResending(false)
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
        {/* Left Panel - Verification Info */}
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
                Verify Your Email
              </h2>
              <p className="text-gray-600 mb-8">We've sent a verification link to your email address</p>
            </div>

            {/* Verification Info */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 mb-8">
              <div className="text-center space-y-6">
                {/* Email Icon */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    We've sent a verification link to your email address. Click the link in the email to verify your account and complete the registration process.
                  </p>
                </div>

                {/* Steps */}
                <div className="space-y-3 text-left">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-xs font-semibold">1</span>
                    </div>
                    <span className="text-sm text-gray-600">Check your email inbox</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-xs font-semibold">2</span>
                    </div>
                    <span className="text-sm text-gray-600">Click the verification link</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-xs font-semibold">3</span>
                    </div>
                    <span className="text-sm text-gray-600">Complete your account setup</span>
                  </div>
                </div>

                {/* Resend Email */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-4">
                    Didn't receive the email? Check your spam folder or request a new one.
                  </p>
                  
                  {resendMessage && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-green-600 text-sm">{resendMessage}</p>
                    </div>
                  )}

                  <button
                    onClick={handleResendEmail}
                    disabled={isResending}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isResending ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </div>
                    ) : (
                      "Resend Verification Email"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Back to Login */}
            <div className="text-center">
              <p className="text-gray-600">
                Already verified?{" "}
                <Link
                  href="/login"
                  className="text-teal-500 font-medium hover:underline"
                >
                  Sign in to your account
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Success Illustration */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8">
          <div className="relative w-full max-w-lg">
            {/* Main Success Card */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              {/* Success Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-sm text-gray-500 font-medium">Email Verification</div>
              </div>

              {/* Success Content */}
              <div className="space-y-6 text-center">
                <div>
                  <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Almost There!</h3>
                  <p className="text-gray-600 text-sm">
                    Your account is being set up. Just one click away from accessing your dashboard.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span className="text-sm text-gray-600">Account Created</span>
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                    <span className="text-sm text-gray-600">Email Verification</span>
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 opacity-50">
                    <span className="text-sm text-gray-400">Company Setup</span>
                    <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
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
