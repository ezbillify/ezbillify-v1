// src/components/shared/layout/AuthLayout.js
export const AuthLayout = ({ children, title, subtitle }) => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 mb-6 shadow-lg shadow-blue-500/25">
              <span className="text-white font-bold text-xl">EZ</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {title}
            </h2>
            {subtitle && (
              <p className="text-slate-600">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Content */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            {children}
          </div>
          
          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-slate-500">
              © 2024 EzBillify. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    )
  }