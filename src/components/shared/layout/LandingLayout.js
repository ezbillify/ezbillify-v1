// src/components/shared/layout/LandingLayout.js
export const LandingLayout = ({ children }) => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    )
  }