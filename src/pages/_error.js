// src/pages/_error.js
import Link from 'next/link'

function Error({ statusCode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            {statusCode || 'Error'}
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            {statusCode
              ? `A ${statusCode} error occurred on server`
              : 'An error occurred on client'}
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Something went wrong. Please try again or contact support if the problem persists.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Go Home
          </Link>
          <div className="text-center">
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Access Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
