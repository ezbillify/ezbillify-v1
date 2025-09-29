// pages/others/index.js
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/shared/ui/Card'
import Button from '../../components/shared/ui/Button'

const OthersIndex = () => {
  const router = useRouter()
  const { user, company } = useAuth()

  const quickActions = [
    {
      title: 'Settings',
      description: 'Configure your company settings, document numbering, print templates, and integrations',
      href: '/others/settings',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Barcode Sticker',
      description: 'Generate and print barcode stickers for your products and inventory management',
      href: '/others/barcode-sticker',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0-3h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M5 8h2a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1zm12 0h2a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v3a1 1 0 001 1zM5 20h2a1 1 0 001-1v-3a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1z" />
        </svg>
      ),
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ]

  const recentSettings = [
    {
      label: 'Company Profile',
      description: 'Last updated 2 days ago',
      href: '/others/settings?tab=company'
    },
    {
      label: 'Document Numbering',
      description: 'Invoice format: INV-001',
      href: '/others/settings?tab=numbering'
    },
    {
      label: 'Print Templates', 
      description: '4 templates configured',
      href: '/others/settings?tab=templates'
    }
  ]

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
                <h1 className="text-3xl font-bold text-gray-900">Settings & Utilities</h1>
                <p className="text-lg text-gray-600">
                  Configure your system settings and manage utilities for {company?.name || 'your business'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Settings & Utilities</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Configure your system settings and manage utilities for {company?.name || 'your business'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action) => (
              <Card 
                key={action.title}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(action.href)}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${action.bgColor}`}>
                    <div className={action.color}>
                      {action.icon}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {action.title}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {action.description}
                    </p>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(action.href)
                      }}
                    >
                      Open {action.title}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Recent Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Settings</h3>
                
                <div className="space-y-3">
                  {recentSettings.map((setting, index) => (
                    <div 
                      key={index}
                      onClick={() => router.push(setting.href)}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">{setting.label}</h4>
                        <p className="text-sm text-gray-600">{setting.description}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => router.push('/others/settings')}
                  >
                    View All Settings
                  </Button>
                </div>
              </Card>
            </div>

            {/* Quick Info */}
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Info</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Company:</span>
                    <span className="font-medium text-gray-900">{company?.name || 'Not Set'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">User Role:</span>
                    <span className="font-medium text-gray-900 capitalize">{user?.role || 'Unknown'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Currency:</span>
                    <span className="font-medium text-gray-900">{company?.billing_currency || 'INR'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timezone:</span>
                    <span className="font-medium text-gray-900">{company?.timezone || 'Asia/Kolkata'}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
                
                <div className="space-y-3 text-sm text-gray-600">
                  <p>Configure your company settings to ensure accurate invoicing and compliance.</p>
                  <p>Use barcode stickers for better inventory management and faster checkout.</p>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <Button
                      variant="ghost" 
                      size="sm"
                      fullWidth
                    >
                      View Documentation
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* System Status */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-gray-900">Company Setup</div>
                  <div className="text-sm text-gray-600">Profile Complete</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-gray-900">Document Numbering</div>
                  <div className="text-sm text-gray-600">Configured</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-gray-900">Print Templates</div>
                  <div className="text-sm text-gray-600">4 Templates</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default OthersIndex