// src/components/shared/layout/AppLayout.js
import React, { useState } from 'react'
import Sidebar from '../navigation/Sidebar'
import { TopBar } from '../navigation/TopBar'
import { ToastContainer } from '../feedback/Toast'
import ErrorBoundary from '../feedback/ErrorBoundary'

const AppLayout = ({ children, title, actions, breadcrumbs }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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