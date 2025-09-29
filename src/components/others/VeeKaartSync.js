// src/components/others/VeeKaartSync.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'

// Icons (same as before)
const RefreshCw = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const Sync = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const CheckCircle = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const AlertTriangle = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 21.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
)

const Clock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const Package = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
  </svg>
)

const Users = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const ShoppingCart = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
  </svg>
)

const Archive = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
)

const Database = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>
)

const Play = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polygon points="5,3 19,12 5,21"></polygon>
  </svg>
)

const Pause = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
)

const Activity = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline>
  </svg>
)

const AlertCircle = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
)

const VeeKaartSync = () => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState({})
  const [connectionStatus, setConnectionStatus] = useState('unknown')
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)

  const syncTypes = [
    {
      id: 'products',
      name: 'Products',
      description: 'Sync product catalog from EzBillify to VeeKaart',
      icon: Package,
      direction: 'ez_to_vk',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      estimatedTime: '2-5 minutes',
      apiEndpoint: '/api/integrations/veekaart/sync-products'
    },
    {
      id: 'inventory',
      name: 'Inventory',
      description: 'Sync stock levels from EzBillify to VeeKaart',
      icon: Archive,
      direction: 'ez_to_vk',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      estimatedTime: '1-2 minutes',
      apiEndpoint: '/api/integrations/veekaart/sync-inventory'
    },
    {
      id: 'pricing',
      name: 'Pricing',
      description: 'Sync pricing updates from EzBillify to VeeKaart',
      icon: ShoppingCart,
      direction: 'ez_to_vk',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      estimatedTime: '1-3 minutes',
      apiEndpoint: '/api/integrations/veekaart/sync-pricing'
    }
  ]

  useEffect(() => {
    checkConnectionStatus()
  }, [company])

  const checkConnectionStatus = async () => {
    if (!company?.id) return
    
    try {
      // Check if VeeKaart integration exists and is active
      const response = await fetch(`/api/integrations?company_id=${company.id}`)
      const result = await response.json()
      
      if (result.success) {
        const veekaartIntegration = result.data?.find(i => i.integration_type === 'veekaart')
        if (veekaartIntegration && veekaartIntegration.is_active) {
          setConnectionStatus('connected')
        } else {
          setConnectionStatus('not_configured')
        }
      } else {
        setConnectionStatus('error')
      }
    } catch (err) {
      console.error('Error checking connection:', err)
      setConnectionStatus('error')
    }
  }

  const handleSyncData = async (syncType) => {
    if (!company?.id) {
      error('Company information not available')
      return
    }

    const syncConfig = syncTypes.find(st => st.id === syncType)
    if (!syncConfig) return

    setSyncing({ ...syncing, [syncType]: true })

    try {
      const response = await fetch(syncConfig.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: company.id,
          sync_all: true
        })
      })

      const result = await response.json()
      
      if (result.success) {
        success(`${syncConfig.name} sync completed successfully`)
      } else {
        error(result.error || `Failed to sync ${syncConfig.name}`)
      }
    } catch (err) {
      console.error('Error syncing data:', err)
      error(`Failed to sync ${syncConfig.name}`)
    } finally {
      setSyncing({ ...syncing, [syncType]: false })
    }
  }

  const handleFullSync = async () => {
    if (!confirm('Full sync will synchronize all data types. This may take 10-20 minutes. Continue?')) {
      return
    }

    setSyncing({ full: true })

    try {
      // Run all sync types sequentially
      for (const syncType of syncTypes) {
        await handleSyncData(syncType.id)
      }
      success('Full synchronization completed successfully')
    } catch (err) {
      console.error('Error in full sync:', err)
      error('Full synchronization failed')
    } finally {
      setSyncing({ ...syncing, full: false })
    }
  }

  const getConnectionStatusDisplay = () => {
    const statusConfig = {
      'connected': { icon: CheckCircle, color: 'text-green-600', label: 'Connected', bgColor: 'bg-green-50' },
      'not_configured': { icon: AlertCircle, color: 'text-orange-600', label: 'Not Configured', bgColor: 'bg-orange-50' },
      'error': { icon: AlertCircle, color: 'text-red-600', label: 'Connection Error', bgColor: 'bg-red-50' },
      'unknown': { icon: Clock, color: 'text-gray-600', label: 'Checking...', bgColor: 'bg-gray-50' }
    }
    
    return statusConfig[connectionStatus] || statusConfig.unknown
  }

  const connectionStatusDisplay = getConnectionStatusDisplay()
  const ConnectionIcon = connectionStatusDisplay.icon

  if (connectionStatus === 'not_configured') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">VeeKaart Integration Not Configured</h2>
          <p className="text-gray-600 mb-6">
            Please set up your VeeKaart integration in the Integration Settings first.
          </p>
          <Button
            onClick={() => window.location.href = '/others/settings?tab=integrations'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Configure Integration
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">VeeKaart Synchronization</h1>
          <p className="text-gray-600 mt-1">
            Sync your product catalog, inventory, and pricing with VeeKaart
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center px-3 py-2 rounded-lg ${connectionStatusDisplay.bgColor}`}>
            <ConnectionIcon className={`w-4 h-4 mr-2 ${connectionStatusDisplay.color}`} />
            <span className={`text-sm font-medium ${connectionStatusDisplay.color}`}>
              {connectionStatusDisplay.label}
            </span>
          </div>

          {/* Refresh */}
          <Button
            onClick={checkConnectionStatus}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sync Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Data Type Sync Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {syncTypes.map(syncType => {
              const IconComponent = syncType.icon
              const isSyncing = syncing[syncType.id]
              
              return (
                <Card key={syncType.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`p-3 rounded-lg ${syncType.bgColor} mr-3`}>
                        <IconComponent className={`w-6 h-6 ${syncType.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{syncType.name}</h3>
                        <p className="text-sm text-gray-600">
                          EZ → VK
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{syncType.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Est. Time:</span>
                      <span className="text-gray-900">{syncType.estimatedTime}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSyncData(syncType.id)}
                    loading={isSyncing}
                    disabled={isSyncing || connectionStatus !== 'connected'}
                    variant="outline"
                    className="w-full"
                  >
                    <Sync className="w-4 h-4 mr-2" />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </Card>
              )
            })}
          </div>

          {/* Full Sync Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Synchronization</h3>
                <p className="text-gray-600 mb-4">
                  Synchronize all data types in sequence. This may take 10-20 minutes.
                </p>
              </div>
              
              <Button
                onClick={handleFullSync}
                loading={syncing.full}
                disabled={syncing.full || connectionStatus !== 'connected'}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Database className="w-4 h-4 mr-2" />
                {syncing.full ? 'Running...' : 'Full Sync'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          
          {/* Sync Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Information</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium text-gray-900 mb-1">Products</div>
                <div className="text-gray-600">
                  EzBillify items → VeeKaart products<br />
                  Includes: name, SKU, price, categories
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-900 mb-1">Inventory</div>
                <div className="text-gray-600">
                  EzBillify stock → VeeKaart inventory<br />
                  Real-time stock level updates
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-900 mb-1">Pricing</div>
                <div className="text-gray-600">
                  EzBillify prices → VeeKaart pricing<br />
                  Includes: selling price, MRP
                </div>
              </div>
            </div>
          </Card>

          {/* Status Card */}
          <Card className="p-6 bg-blue-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Status</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Connection</span>
                <span className={`text-sm font-medium ${connectionStatusDisplay.color}`}>
                  {connectionStatusDisplay.label}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Direction</span>
                <span className="text-sm text-gray-900">EzBillify → VeeKaart</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto Sync</span>
                <span className="text-sm text-gray-900">Manual</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default VeeKaartSync