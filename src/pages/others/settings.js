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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
                <p className="text-sm text-gray-500">Configure system settings and preferences</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Settings Navigation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Tab Headers */}
            <div className="border-b border-gray-200">
              <div className="px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
                <p className="text-gray-600 mt-1">Configure your system preferences and settings</p>
              </div>
              
              <div className="px-6">
                <div className="flex space-x-1 overflow-x-auto">
                  {availableTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setShowUserForm(false)
                        setEditingUser(null)
                      }}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs text-gray-500 hidden sm:block">
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div>
              {renderActiveComponent()}
            </div>
          </div>

          {/* Quick Actions for User Management */}
          {activeTab === 'users' && !showUserForm && user?.role === 'admin' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">Quick Actions</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Add workforce users or manage existing team members
                  </p>
                </div>
                <button
                  onClick={handleUserAdd}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Add Workforce User
                </button>
              </div>
            </div>
          )}

          {/* Settings Help */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">💡</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900">Settings Tips</h4>
                <div className="mt-1 text-sm text-gray-600">
                  {activeTab === 'company' && (
                    <p>Keep your company information updated for accurate invoices and GST compliance.</p>
                  )}
                  {activeTab === 'numbering' && (
                    <p>Document numbering resets automatically every financial year. You can change the format anytime.</p>
                  )}
                  {activeTab === 'users' && (
                    <p>Only workforce users can be added here. Admins manage full system access.</p>
                  )}
                  {activeTab === 'templates' && (
                    <p>Customize your invoice and document layouts to match your brand identity.</p>
                  )}
                  {activeTab === 'barcode' && (
                    <p>Generate professional barcode stickers for inventory management and product tracking.</p>
                  )}
                  {activeTab === 'integrations' && (
                    <p>Connect with external services to automate your business workflows.</p>
                  )}
                  {activeTab === 'veekaart' && (
                    <p>Sync your VeeKaart e-commerce data automatically with EzBillify.</p>
                  )}
                  {activeTab === 'export' && (
                    <p>Regular data exports help with backups, compliance, and business analysis.</p>
                  )}
                  {activeTab === 'audit' && (
                    <p>Audit trails are essential for compliance and tracking system changes.</p>
                  )}
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