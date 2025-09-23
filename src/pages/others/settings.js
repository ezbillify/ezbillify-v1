// pages/others/settings.js
import { useState } from 'react'
import DocumentNumbering from '../../components/others/DocumentNumbering'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('document-numbering')

  const tabs = [
    { id: 'document-numbering', label: 'Document Numbering', component: DocumentNumbering },
    { id: 'company-profile', label: 'Company Profile' },
    { id: 'users', label: 'User Management' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'backup', label: 'Backup & Export' }
  ]

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure your EzBillify system settings
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm">
              {ActiveComponent ? (
                <ActiveComponent />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {tabs.find(tab => tab.id === activeTab)?.label} settings coming soon...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}