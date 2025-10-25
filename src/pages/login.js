// src/pages/login.js
// Updated for 1-minute (60 second) OTP expiry with countdown timer and attempt limiting

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
// import Image from 'next/image'
import Head from 'next/head'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import WorkforceAccessDenied from '../components/auth/WorkforceAccessDenied'

const LoginForm = ({ onSwitchToOTP }) => {
  const { signIn } = useAuth()
  const router = useRouter()
  const { success, error } = useToast()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const result = await signIn(email, password)
      if (result.error) {
        setErrorMsg(result.error)
        error(result.error || 'Login failed')
      } else {
        success('Login successful')
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred. Please try again.'
      setErrorMsg(errorMessage)
      error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600 text-sm">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={loading}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-sm disabled:opacity-50"
              placeholder="Enter your email"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white pr-10 text-sm disabled:opacity-50"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 text-sm"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Signing in...
            </div>
          ) : (
            "Sign in to Dashboard"
          )}
        </button>
      </form>

      <div className="mt-6 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSwitchToOTP}
        disabled={loading}
        className="w-full mt-6 text-gray-700 hover:text-gray-900 py-2.5 px-4 font-medium text-sm transition-colors hover:bg-gray-50 rounded-xl"
      >
        Use OTP instead
      </button>
    </>
  )
}

const OTPForm = ({ onSwitchToPassword }) => {
  const router = useRouter()
  const { verifyOTP } = useAuth()
  const { success, error } = useToast()
  
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [step, setStep] = useState("email")
  const [resendCountdown, setResendCountdown] = useState(0)
  
  // 🔑 NEW: OTP expiry tracking (60 seconds = 1 minute)
  const [otpSentTime, setOtpSentTime] = useState(null)
  const [otpExpiry, setOtpExpiry] = useState(0)
  const [otpAttempts, setOtpAttempts] = useState(0)
  const MAX_OTP_ATTEMPTS = 5  // Changed from 3 to 5 for 1 minute

  // 🔑 NEW: Countdown timer for OTP expiry (60 seconds)
  useEffect(() => {
    let interval
    if (step === "verify" && otpSentTime) {
      interval = setInterval(() => {
        const now = Date.now()
        const timeLeft = Math.max(0, 60000 - (now - otpSentTime))  // 60 seconds in milliseconds
        const secondsLeft = Math.ceil(timeLeft / 1000)
        setOtpExpiry(secondsLeft)

        // If OTP expired
        if (secondsLeft === 0) {
          setErrorMsg("OTP expired. Request a new one.")
          error("OTP expired. Request a new one.")
          setStep("email")
          setOtp(["", "", "", "", "", ""])
          setOtpSentTime(null)
        }
      }, 100)
    }
    return () => clearInterval(interval)
  }, [step, otpSentTime, error])

  useEffect(() => {
    let interval
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendCountdown])

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await response.json()
      
      if (response.ok) {
        setStep("verify")
        setResendCountdown(60)
        setOtpSentTime(Date.now())  // 🔑 Start OTP timer
        setOtpExpiry(60)  // 60 seconds
        setOtpAttempts(0)  // Reset attempts
        success('OTP sent to your email')
      } else {
        const errorMessage = data.message || 'Failed to send OTP. Please try again.'
        setErrorMsg(errorMessage)
        error(errorMessage)
      }
    } catch (err) {
      const errorMessage = 'An error occurred. Please try again.'
      setErrorMsg(errorMessage)
      error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const otpCode = otp.join("")
    
    if (otpCode.length !== 6) {
      setErrorMsg("Please enter all 6 digits")
      error("Please enter all 6 digits")
      return
    }

    // 🔑 Check if OTP expired
    if (otpExpiry === 0) {
      setErrorMsg("OTP expired. Request a new one.")
      error("OTP expired. Request a new one.")
      setStep("email")
      setOtp(["", "", "", "", "", ""])
      return
    }

    // 🔑 Check attempt limit (5 attempts for 1 minute)
    if (otpAttempts >= MAX_OTP_ATTEMPTS) {
      setErrorMsg("Too many attempts. Request a new OTP.")
      error("Too many attempts. Request a new OTP.")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const result = await verifyOTP(email, otpCode)
      
      if (result.error) {
        const newAttempts = otpAttempts + 1
        setOtpAttempts(newAttempts)

        let displayError = result.error
        
        if (result.error.includes('Invalid OTP') || result.error.includes('expired')) {
          displayError = `Invalid OTP. ${MAX_OTP_ATTEMPTS - newAttempts} attempts remaining.`
        } else if (result.error.includes('not found')) {
          displayError = 'Email not found. Please create an account.'
        }
        
        setErrorMsg(displayError)
        error(displayError)
      } else {
        success('Login successful')
      }
    } catch (err) {
      const errorMessage = 'OTP verification failed. Please try again.'
      setErrorMsg(errorMessage)
      error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return
    
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  // 🔑 Format time display MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (step === "verify") {
    return (
      <>
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{errorMsg}</p>
          </div>
        )}

        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter verification code</h3>
          <p className="text-sm text-gray-600">We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span></p>
          
          {/* 🔑 NEW: Countdown timer (MM:SS format) */}
          <div className={`mt-3 text-3xl font-bold font-mono ${otpExpiry > 30 ? 'text-green-600' : otpExpiry > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
            {formatTime(otpExpiry)}
          </div>
          <p className="text-xs text-gray-500 mt-1">Time remaining</p>
        </div>

        <form onSubmit={handleVerifyOTP} className="space-y-6">
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                disabled={loading || otpExpiry === 0}
                autoFocus={index === 0}
                className="w-12 h-12 text-center text-lg font-bold border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 hover:bg-white disabled:opacity-50"
              />
            ))}
          </div>

          {/* 🔑 NEW: Attempts counter */}
          {otpAttempts > 0 && otpAttempts < MAX_OTP_ATTEMPTS && (
            <p className="text-xs text-yellow-600 text-center">
              {MAX_OTP_ATTEMPTS - otpAttempts} attempts remaining
            </p>
          )}

          <button
            type="submit"
            disabled={loading || otp.some(d => !d) || otpExpiry === 0 || otpAttempts >= MAX_OTP_ATTEMPTS}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 text-sm"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Verifying...
              </div>
            ) : (
              "Verify Code"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-3">Didn't receive the code?</p>
          <button
            type="button"
            onClick={() => {
              setStep("email")
              setOtp(["", "", "", "", "", ""])
              setErrorMsg(null)
              setOtpAttempts(0)
            }}
            disabled={resendCountdown > 0 || loading}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Send again"}
          </button>
        </div>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSwitchToPassword}
          disabled={loading}
          className="w-full mt-6 text-gray-700 hover:text-gray-900 py-2.5 px-4 font-medium text-sm transition-colors hover:bg-gray-50 rounded-xl"
        >
          Use password instead
        </button>
      </>
    )
  }

  return (
    <>
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600 text-sm">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSendOTP} className="space-y-4">
        <div>
          <label htmlFor="otp-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <input
              id="otp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-sm disabled:opacity-50"
              placeholder="Enter your email"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center">
          We'll send you a 6-digit code to verify your identity
        </p>

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 text-sm"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending code...
            </div>
          ) : (
            "Send Verification Code"
          )}
        </button>
      </form>

      <div className="mt-6 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSwitchToPassword}
        disabled={loading}
        className="w-full mt-6 text-gray-700 hover:text-gray-900 py-2.5 px-4 font-medium text-sm transition-colors hover:bg-gray-50 rounded-xl"
      >
        Use password instead
      </button>
    </>
  )
}

export default function LoginPage() {
  const { isAuthenticated, hasCompany, loading, isWorkforce } = useAuth()
  const router = useRouter()
  const [authMethod, setAuthMethod] = useState("password")
  const [showWorkforceBlock, setShowWorkforceBlock] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // 🔒 Check if user is workforce - block web access
      if (isWorkforce) {
        console.log('LoginPage - Workforce user detected, blocking access')
        setShowWorkforceBlock(true)
        return
      }

      // Regular admin user flow
      const redirectTo = router.query.redirectTo || '/dashboard'
      if (hasCompany) {
        router.replace(redirectTo)
      } else {
        router.replace('/setup')
      }
    }
  }, [isAuthenticated, hasCompany, loading, isWorkforce, router])

  // 🔒 Show workforce block screen FIRST (before any redirects)
  if (showWorkforceBlock) {
    return <WorkforceAccessDenied autoLogout={true} countdown={5} />
  }

  if (loading || (isAuthenticated && !isWorkforce)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Login - EzBillify | Your Admin Panel</title>
        <meta name="description" content="Secure login to your EzBillify admin panel. Access your business dashboard with email and password or OTP authentication." />
        <link rel="preload" href="/ezbillifyfavicon.png" as="image" />
      </Head>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{ willChange: 'transform' }}>
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity' }}></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-indigo-400 to-pink-500 rounded-full blur-3xl animate-pulse delay-1000" style={{ willChange: 'opacity' }}></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-2xl animate-pulse delay-500" style={{ willChange: 'opacity' }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex">
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 lg:px-16">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-10">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 relative">
                  <img
                    src="/ezbillifyfavicon.png"
                    alt="EzBillify Logo"
                    width="64"
                    height="64"
                    className="rounded-xl shadow-lg"
                    priority
                  />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-1 text-gray-900">
                Welcome to EzBillify
              </h2>
              <p className="text-gray-600 mb-8">Your Admin Panel</p>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 mb-8">
              {authMethod === "password" ? (
                <LoginForm onSwitchToOTP={() => setAuthMethod("otp")} />
              ) : (
                <OTPForm onSwitchToPassword={() => setAuthMethod("password")} />
              )}
            </div>

            <div className="text-center">
              <p className="text-gray-600">
                New to EzBillify?{" "}
                <Link
                  href="/register"
                  className="text-teal-500 font-medium hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">Secure Access</p>
              </div>
              <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">Real-time Data</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8">
          <div className="relative w-full max-w-lg">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-sm text-gray-500 font-medium">EzBillify Dashboard</div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Business Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4">
                      <div className="text-2xl font-bold text-blue-600">₹2.4L</div>
                      <div className="text-sm text-blue-500">Monthly Revenue</div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4">
                      <div className="text-2xl font-bold text-green-600">148</div>
                      <div className="text-sm text-green-500">Active Invoices</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-3">Recent Activity</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">Invoice #1024 generated</div>
                        <div className="text-xs text-gray-500">2 minutes ago</div>
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">Payment received</div>
                        <div className="text-xs text-gray-500">5 minutes ago</div>
                      </div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-3/4 animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl rotate-12 opacity-80 shadow-lg"></div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-r from-pink-400 to-red-500 rounded-xl rotate-45 opacity-80 shadow-lg"></div>
            <div className="absolute top-1/2 -left-6 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg rotate-12 opacity-60 shadow-lg"></div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}