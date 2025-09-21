// Universal placeholder template - copy this to ALL empty page files
import React from 'react'
import { useRouter } from 'next/router'

const PlaceholderPage = () => {
  const router = useRouter()
  
  // Extract page name from the route
  const getPageName = () => {
    const path = router.pathname
    const segments = path.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1]
    
    // Convert kebab-case to Title Case
    return lastSegment
      ?.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Page'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </div>
        
        {/* Content */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          {getPageName()}
        </h1>
        
        <p className="text-slate-600 mb-6 leading-relaxed">
          This page is under development and will be available soon.
        </p>
        
        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
          
          <button
            onClick={() => router.back()}
            className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
        
        {/* Footer */}
        <p className="text-xs text-slate-400 mt-6">
          EzBillify V1 - Coming Soon
        </p>
      </div>
    </div>
  )
}

export default PlaceholderPage