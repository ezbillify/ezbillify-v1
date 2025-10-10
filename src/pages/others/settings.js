// pages/others/settings.js
import { useState } from 'react'
import { useRouter } from 'next/router'
import CompanyProfile from '../../components/others/CompanyProfile'
import DocumentNumbering from '../../components/others/DocumentNumbering'
import PrintTemplates from '../../components/others/PrintTemplates'
import IntegrationSettings from '../../components/others/IntegrationSettings'
import VeeKaartSync from '../../components/others/VeeKaartSync'
import DataExport from '../../components/others/DataExport'
import AuditTrail from '../../components/others/AuditTrail'
import UserList from '../../components/others/UserList'
import UserForm from '../../components/others/UserForm'
import { useAuth } from '../../context/AuthContext'

// Barcode Sticker Component (inline for now)
const BarcodeSticker = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Barcode Sticker</h2>
      <p className="text-gray-600">Generate and print barcode stickers for your products.</p>
      <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <p className="text-gray-500">Barcode sticker functionality coming soon...</p>
      </div>
    </div>
  )
}

const SettingsPage = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('company')
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  // Settings tabs configuration
  const settingsTabs = [
    {
      id: 'company',
      label: 'Company Profile',
      description: 'Company information and branding',
      component: CompanyProfile
    },
    {
      id: 'numbering',
      label: 'Document Numbering',
      description: 'Configure invoice and document sequences',
      component: DocumentNumbering
    },
    {
      id: 'users',
      label: 'User Management',
      description: 'Manage users and permissions',
      component: UserList,
      adminOnly: true
    },
    {
      id: 'templates',
      label: 'Print Templates',
      description: 'Customize invoice and document templates',
      component: PrintTemplates
    },
    {
      id: 'integrations',
      label: 'Integrations',
      description: 'Third-party app connections',
      component: IntegrationSettings
    },
    {
      id: 'veekaart',
      label: 'VeeKaart Sync',
      description: 'E-commerce synchronization',
      component: VeeKaartSync
    },
    {
      id: 'export',
      label: 'Data Export',
      description: 'Export and backup your data',
      component: DataExport
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      description: 'View system activity logs',
      component: AuditTrail,
      adminOnly: true
    }
  ]

  // Filter tabs based on user role
  const availableTabs = settingsTabs.filter(tab => 
    !tab.adminOnly || user?.role === 'admin'
  )

  const handleUserEdit = (userToEdit) => {
    setEditingUser(userToEdit)
    setShowUserForm(true)
  }

  const handleUserAdd = () => {
    setEditingUser(null)
    setShowUserForm(true)
  }

  const handleUserFormClose = () => {
    setShowUserForm(false)
    setEditingUser(null)
  }

  const handleUserSave = (savedUser) => {
    setShowUserForm(false)
    setEditingUser(null)
    // UserList component will refresh automatically
  }

  const renderActiveComponent = () => {
    const activeTabConfig = availableTabs.find(tab => tab.id === activeTab)
    if (!activeTabConfig) return null

    const Component = activeTabConfig.component

    // Special handling for UserList to pass event handlers
    if (activeTab === 'users') {
      if (showUserForm) {
        return (
          <div className="p-6">
            <UserForm
              user={editingUser}
              onSave={handleUserSave}
              onCancel={handleUserFormClose}
            />
          </div>
        )
      }
      
      return (
        <Component
          onEdit={handleUserEdit}
          onAdd={handleUserAdd}
        />
      )
    }

    return <Component />
  }

  const getSettingsTip = () => {
    const tips = {
      company: 'Keep your company information updated for accurate invoices and GST compliance.',
      numbering: 'Document numbering resets automatically every financial year. You can change the format anytime.',
      users: 'Only workforce users can be added here. Admins manage full system access.',
      templates: 'Customize your invoice and document layouts to match your brand identity.',
      barcode: 'Generate professional barcode stickers for inventory management and product tracking.',
      integrations: 'Connect with external services to automate your business workflows.',
      veekaart: 'Sync your VeeKaart e-commerce data automatically with EzBillify.',
      export: 'Regular data exports help with backups, compliance, and business analysis.',
      audit: 'Audit trails are essential for compliance and tracking system changes.'
    }
    return tips[activeTab] || ''
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all hover:gap-3 group"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">←</span>
                <span className="font-medium">Back</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Company Settings</h1>
                <p className="text-sm text-gray-600 mt-0.5">Configure system settings and preferences</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/70 overflow-hidden sticky top-24">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700">
                <h2 className="text-lg font-semibold text-white">Settings Menu</h2>
                <p className="text-blue-100 text-sm mt-1">Choose a category</p>
              </div>
              
              <nav className="p-2">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setShowUserForm(false)
                      setEditingUser(null)
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-all duration-200 group ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-600/20'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${
                          activeTab === tab.id ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          {tab.label}
                        </div>
                        <div className={`text-xs mt-0.5 truncate ${
                          activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {tab.description}
                        </div>
                      </div>
                      {activeTab === tab.id && (
                        <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Content Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/70 overflow-hidden">
              <div className="border-b border-gray-200/70 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {availableTabs.find(t => t.id === activeTab)?.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {availableTabs.find(t => t.id === activeTab)?.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white">
                {renderActiveComponent()}
              </div>
            </div>

            {/* Quick Actions for User Management */}
            {activeTab === 'users' && !showUserForm && user?.role === 'admin' && (
              <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200/70 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900">Quick Actions</h4>
                      <p className="text-sm text-blue-700 mt-0.5">
                        Add workforce users or manage existing team members
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleUserAdd}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                  >
                    Add User
                  </button>
                </div>
              </div>
            )}

            {/* Settings Help */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/30 border border-amber-200/70 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-900">Helpful Tip</h4>
                  <p className="mt-1.5 text-sm text-amber-800 leading-relaxed">
                    {getSettingsTip()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage