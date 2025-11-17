// src/components/shared/layout/AppLayout.js
import React, { useState } from 'react'
import Sidebar from '../navigation/Sidebar'
import { TopBar } from '../navigation/TopBar'
import { ToastContainer } from '../feedback/Toast'
import ErrorBoundary from '../feedback/ErrorBoundary'
import SubscriptionOverlay from '../subscription/SubscriptionOverlay'
import { useAuth } from '../../../context/AuthContext'

const AppLayout = ({ children, title, actions, breadcrumbs }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { company } = useAuth()

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  const handleRetryPayment = () => {
    // Implement retry payment logic
    console.log('Retry payment clicked')
    // For now, we'll just show an alert
    alert('Retry payment functionality would be implemented here')
  }

  const handleContinueSubscription = () => {
    // Implement continue subscription logic
    console.log('Continue subscription clicked')
    // For now, we'll just show an alert
    alert('Continue subscription functionality would be implemented here')
  }

  // Check if company exists and is inactive
  const isCompanyInactive = company && company.status === 'inactive'

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Subscription Overlay - Show when company is inactive */}
        {isCompanyInactive && (
          <SubscriptionOverlay
            company={company}
            onRetryPayment={handleRetryPayment}
            onContinueSubscription={handleContinueSubscription}
          />
        )}

        {/* Sidebar */}
        <Sidebar 
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
        />
        
        {/* Main Content Area */}
        <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          {/* Top Bar */}
          <TopBar
            title={title}
            onSidebarToggle={toggleSidebar}
            actions={actions}
            breadcrumbs={breadcrumbs}
          />
          
          {/* Page Content */}
          <main className="p-6">
            {children}
          </main>
        </div>
        
        {/* Toast Notifications */}
        <ToastContainer />
      </div>
    </ErrorBoundary>
  )
}

export default AppLayout