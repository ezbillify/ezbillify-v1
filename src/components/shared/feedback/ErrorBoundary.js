// src/components/shared/feedback/ErrorBoundary.js
import React from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  logErrorToService = (error, errorInfo) => {
    console.error('Error logged to service:', {
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    })
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    }
  }

  handleReportError = () => {
    const errorReport = {
      errorId: this.state.errorId,
      error: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    }

    // Copy to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
        .then(() => alert('Error details copied to clipboard'))
        .catch(() => console.error('Failed to copy error details'))
    } else {
      console.error('Clipboard not available')
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo)
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full text-center" padding="lg">
            {/* Error Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-bold text-slate-900 mb-4">
              Oops! Something went wrong
            </h1>
            
            <p className="text-slate-600 mb-6 leading-relaxed">
              We're sorry, but something unexpected happened. Our team has been notified and we're working to fix this issue.
            </p>

            {/* Error ID */}
            <div className="bg-slate-100 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-700">
                <span className="font-medium">Error ID:</span> {this.state.errorId}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Please include this ID when reporting the issue
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={this.handleReload}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
              >
                Reload Page
              </Button>
              
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                }
              >
                Go to Dashboard
              </Button>

              <Button
                variant="ghost"
                onClick={this.handleReportError}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              >
                Copy Error Details
              </Button>
            </div>

            {/* Development Error Details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm font-medium text-slate-700 mb-4">
                  Show Error Details (Development)
                </summary>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
                  <div className="mb-4">
                    <h4 className="font-medium text-red-800 mb-2">Error:</h4>
                    <pre className="text-red-700 whitespace-pre-wrap">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  
                  {this.state.error.stack && (
                    <div className="mb-4">
                      <h4 className="font-medium text-red-800 mb-2">Stack Trace:</h4>
                      <pre className="text-red-700 whitespace-pre-wrap text-xs overflow-x-auto">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {this.state.errorInfo && (
                    <div>
                      <h4 className="font-medium text-red-800 mb-2">Component Stack:</h4>
                      <pre className="text-red-700 whitespace-pre-wrap text-xs overflow-x-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Specialized Error Boundaries for different sections
export const DashboardErrorBoundary = ({ children }) => {
  const fallback = (error, errorInfo) => (
    <Card className="m-4" padding="lg">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Dashboard Error</h3>
        <p className="text-slate-600 mb-4">Unable to load dashboard data</p>
        <Button 
          variant="outline" 
          onClick={() => typeof window !== 'undefined' && window.location.reload()}
        >
          Reload Dashboard
        </Button>
      </div>
    </Card>
  )

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  )
}

export const FormErrorBoundary = ({ children, onReset }) => {
  const fallback = (error, errorInfo) => (
    <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
      <div className="flex items-center space-x-3">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 className="font-semibold text-red-800">Form Error</h4>
          <p className="text-red-700">There was an error with the form. Please try again.</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onReset || (() => typeof window !== 'undefined' && window.location.reload())}
            className="mt-2"
          >
            Reset Form
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary