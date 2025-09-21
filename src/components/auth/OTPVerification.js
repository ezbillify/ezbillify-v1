// src/components/auth/OTPVerification.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../services/utils/supabase'

const OTPVerification = ({ email, onVerificationComplete }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const router = useRouter()

  // Start countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) return // Prevent multiple characters

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }

    // Auto-verify when all 6 digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerifyOtp(newOtp.join(''))
    }

    // Clear error when user starts typing
    if (error) setError('')
  }

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  // Verify OTP
  const handleVerifyOtp = async (otpCode) => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Verify OTP with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      })

      if (error) {
        setError(getErrorMessage(error.message))
        return
      }

      // Verification successful
      if (onVerificationComplete) {
        onVerificationComplete(data)
      } else {
        // Default behavior - redirect to setup
        router.push('/setup')
      }

    } catch (error) {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return

    setResendLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        setError(getErrorMessage(error.message))
        return
      }

      // Start countdown
      setResendTimer(60)
      
      // Clear current OTP
      setOtp(['', '', '', '', '', ''])
      document.getElementById('otp-0')?.focus()

    } catch (error) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  // Get user-friendly error messages
  const getErrorMessage = (errorMessage) => {
    const errorMap = {
      'Invalid token': 'Invalid verification code. Please check and try again.',
      'Token has expired': 'Verification code has expired. Please request a new one.',
      'Email rate limit exceeded': 'Too many attempts. Please wait before requesting a new code.',
      'Signup disabled': 'Registration is currently disabled.',
    }

    return errorMap[errorMessage] || 'Verification failed. Please try again.'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verify Your Email
            </h2>
            <p className="text-gray-600 text-sm">
              We've sent a 6-digit verification code to
            </p>
            <p className="text-blue-600 font-medium">
              {email}
            </p>
          </div>

          {/* OTP Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Enter verification code
            </label>
            <div className="flex space-x-3 justify-center">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {/* Verify Button */}
          <button
            onClick={() => handleVerifyOtp(otp.join(''))}
            disabled={loading || otp.some(digit => digit === '')}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </div>
            ) : (
              'Verify Email'
            )}
          </button>

          {/* Resend Section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Didn't receive the code?
            </p>
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-500">
                Resend code in {resendTimer} seconds
              </p>
            ) : (
              <button
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="text-sm text-blue-600 hover:text-blue-500 font-medium focus:outline-none focus:underline disabled:opacity-50"
              >
                {resendLoading ? 'Sending...' : 'Resend verification code'}
              </button>
            )}
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OTPVerification
