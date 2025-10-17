// src/components/others/IntegrationSettings.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'

const RefreshCw = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const Copy = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const Key = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)

const CheckCircle = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const AlertCircle = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
)

const ExternalLink = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
)

const IntegrationSettings = () => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [savingVeekaart, setSavingVeekaart] = useState(false)

  const [apiKeys, setApiKeys] = useState({
    ezbillify_api_key: '',
    ezbillify_webhook_secret: ''
  })

  const [veekaartConfig, setVeekaartConfig] = useState({
    veekaart_api_url: '',
    veekaart_api_key: '',
    veekaart_webhook_secret: '',
    auto_sync_enabled: true
  })

  const [connectionStatus, setConnectionStatus] = useState('unknown')

  useEffect(() => {
    loadApiKeys()
    loadVeekaartConfig()
  }, [company])

  const loadApiKeys = async () => {
    if (!company?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${company.id}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setApiKeys({
          ezbillify_api_key: result.data.api_key || '',
          ezbillify_webhook_secret: result.data.webhook_secret || ''
        })
      }
    } catch (err) {
      console.error('Error loading API keys:', err)
      error('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  const loadVeekaartConfig = async () => {
    if (!company?.id) return

    try {
      const response = await fetch(`/api/integrations?company_id=${company.id}&type=veekaart`)
      const result = await response.json()

      if (result.success && result.data?.length > 0) {
        const integration = result.data[0]
        const apiConfig = integration.api_config || {}
        
        setVeekaartConfig({
          veekaart_api_url: apiConfig.api_url || '',
          veekaart_api_key: apiConfig.api_key || '',
          veekaart_webhook_secret: apiConfig.webhook_secret || '',
          auto_sync_enabled: integration.sync_config?.auto_sync_enabled || true
        })
        
        setConnectionStatus(integration.connection_status || 'unknown')
      }
    } catch (err) {
      console.error('Error loading VeeKaart config:', err)
    }
  }

  const generateNewApiKey = async () => {
    if (!company?.id) return
    
    if (!confirm('Generate new API key? This will invalidate the current key.')) {
      return
    }
    
    setRegenerating(true)
    try {
      const response = await fetch(`/api/companies/${company.id}/regenerate-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setApiKeys({
          ezbillify_api_key: result.data.api_key,
          ezbillify_webhook_secret: result.data.webhook_secret
        })
        success('New API keys generated successfully')
      } else {
        error(result.error || 'Failed to generate API keys')
      }
    } catch (err) {
      console.error('Error:', err)
      error('Failed to generate API keys')
    } finally {
      setRegenerating(false)
    }
  }

  const handleVeekaartChange = (field, value) => {
    setVeekaartConfig({
      ...veekaartConfig,
      [field]: value
    })
  }

  const saveVeekaartConfig = async () => {
    if (!company?.id) {
      error('Company information not available')
      return
    }

    if (!veekaartConfig.veekaart_api_url || !veekaartConfig.veekaart_api_key) {
      error('Please enter VeeKaart API URL and API Key')
      return
    }

    setSavingVeekaart(true)
    try {
      const response = await fetch('/api/integrations/veekaart/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company.id,
          veekaart_api_url: veekaartConfig.veekaart_api_url,
          veekaart_api_key: veekaartConfig.veekaart_api_key,
          veekaart_webhook_secret: veekaartConfig.veekaart_webhook_secret,
          auto_sync_enabled: veekaartConfig.auto_sync_enabled
        })
      })

      const result = await response.json()

      if (result.success) {
        setConnectionStatus('connected')
        success('VeeKaart configuration saved successfully')
        loadVeekaartConfig()
      } else {
        error(result.error || 'Failed to save VeeKaart configuration')
      }
    } catch (err) {
      console.error('Error:', err)
      error('Failed to save VeeKaart configuration')
    } finally {
      setSavingVeekaart(false)
    }
  }

  const testConnection = async () => {
    if (!company?.id) {
      error('Company information not available')
      return
    }

    setTestingConnection(true)
    try {
      const response = await fetch('/api/integrations/veekaart/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id })
      })

      const result = await response.json()

      if (result.success) {
        setConnectionStatus('connected')
        success('Connection test passed successfully')
      } else {
        setConnectionStatus('error')
        error(result.error || 'Connection test failed')
      }
    } catch (err) {
      console.error('Error:', err)
      setConnectionStatus('error')
      error('Failed to test connection')
    } finally {
      setTestingConnection(false)
    }
  }

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      success(`${label} copied to clipboard`)
    } catch (err) {
      error('Failed to copy to clipboard')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'
  const getConnectionStatusIcon = () => {
    if (connectionStatus === 'connected') return <CheckCircle className="w-5 h-5 text-green-500" />
    if (connectionStatus === 'error') return <AlertCircle className="w-5 h-5 text-red-500" />
    return <AlertCircle className="w-5 h-5 text-yellow-500" />
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Settings</h1>
          <p className="text-gray-600 mt-1">Connect VeeKaart and other platforms with EzBillify</p>
        </div>
        <Button onClick={loadApiKeys} variant="outline" disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* EzBillify API Credentials */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Key className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">EzBillify API Credentials</h3>
              <p className="text-gray-600 text-sm">Use these to connect external platforms</p>
            </div>
          </div>
          <Button
            onClick={generateNewApiKey}
            loading={regenerating}
            disabled={regenerating}
            variant="outline"
          >
            Regenerate Keys
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono">
                {apiKeys.ezbillify_api_key || 'Not generated'}
              </code>
              <Button
                onClick={() => copyToClipboard(apiKeys.ezbillify_api_key, 'API Key')}
                size="sm"
                variant="outline"
                disabled={!apiKeys.ezbillify_api_key}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret</label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono">
                {apiKeys.ezbillify_webhook_secret || 'Not generated'}
              </code>
              <Button
                onClick={() => copyToClipboard(apiKeys.ezbillify_webhook_secret, 'Webhook Secret')}
                size="sm"
                variant="outline"
                disabled={!apiKeys.ezbillify_webhook_secret}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* VeeKaart Integration */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center">
            <span className="text-3xl mr-4">🛍️</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">VeeKaart Configuration</h3>
              <p className="text-gray-600 text-sm">Connect your VeeKaart e-commerce platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getConnectionStatusIcon()}
            <span className="text-sm font-medium">
              {connectionStatus === 'connected' && <span className="text-green-600">Connected</span>}
              {connectionStatus === 'error' && <span className="text-red-600">Error</span>}
              {connectionStatus === 'unknown' && <span className="text-yellow-600">Not Configured</span>}
            </span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">VeeKaart API URL</label>
            <input
              type="text"
              placeholder="https://veekaart.example.com"
              value={veekaartConfig.veekaart_api_url}
              onChange={(e) => handleVeekaartChange('veekaart_api_url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">VeeKaart API Key</label>
            <input
              type="password"
              placeholder="Enter your VeeKaart API key"
              value={veekaartConfig.veekaart_api_key}
              onChange={(e) => handleVeekaartChange('veekaart_api_key', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret (Optional)</label>
            <input
              type="password"
              placeholder="Enter webhook secret if required"
              value={veekaartConfig.veekaart_webhook_secret}
              onChange={(e) => handleVeekaartChange('veekaart_webhook_secret', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto_sync"
              checked={veekaartConfig.auto_sync_enabled}
              onChange={(e) => handleVeekaartChange('auto_sync_enabled', e.target.checked)}
              className="w-4 h-4 border border-gray-300 rounded"
            />
            <label htmlFor="auto_sync" className="ml-2 text-sm text-gray-700">
              Enable automatic synchronization
            </label>
          </div>
        </div>

        {/* Webhook URLs */}
        <div className="my-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-3">Webhook URL for VeeKaart</h4>
          <div className="flex items-center space-x-2">
            <code className="flex-1 text-sm bg-white px-3 py-2 border border-blue-200 rounded font-mono">
              {`${baseUrl}/api/webhooks/veekaart/orders`}
            </code>
            <Button
              onClick={() => copyToClipboard(`${baseUrl}/api/webhooks/veekaart/orders`, 'Webhook URL')}
              size="sm"
              variant="outline"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-blue-800 mt-2">Configure this URL in VeeKaart webhook settings</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={saveVeekaartConfig}
            loading={savingVeekaart}
            disabled={savingVeekaart || !veekaartConfig.veekaart_api_url || !veekaartConfig.veekaart_api_key}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {savingVeekaart ? 'Saving...' : 'Save Configuration'}
          </Button>

          <Button
            onClick={testConnection}
            loading={testingConnection}
            disabled={testingConnection || connectionStatus === 'unknown'}
            variant="outline"
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
      </Card>

      {/* Sync Status Card */}
      {connectionStatus === 'connected' && (
        <Card className="p-6 bg-green-50 border border-green-200">
          <div className="flex items-center">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <h3 className="font-semibold text-green-900">Connection Active</h3>
              <p className="text-sm text-green-700">VeeKaart integration is configured and connected</p>
            </div>
          </div>
        </Card>
      )}

      {/* Documentation Link */}
      <Card className="p-6 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Need Help?</h4>
            <p className="text-sm text-gray-600 mt-1">Check our documentation for integration setup guide</p>
          </div>
          <Button variant="outline" className="text-blue-600">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Docs
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default IntegrationSettings