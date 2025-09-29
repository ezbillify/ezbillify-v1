// src/components/others/IntegrationSettings.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'

// Simple icons
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
  const [apiKeys, setApiKeys] = useState({
    ezbillify_api_key: '',
    ezbillify_webhook_secret: ''
  })
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    loadApiKeys()
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

  const generateNewApiKey = async () => {
    if (!company?.id) return
    
    if (!confirm('Generate new API key? This will invalidate the current key and may break existing integrations.')) {
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
          ...apiKeys,
          ezbillify_api_key: result.data.api_key,
          ezbillify_webhook_secret: result.data.webhook_secret
        })
        success('New API keys generated successfully')
      } else {
        error(result.error || 'Failed to generate API keys')
      }
    } catch (err) {
      console.error('Error generating API keys:', err)
      error('Failed to generate API keys')
    } finally {
      setRegenerating(false)
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
        <span className="ml-2 text-gray-600">Loading integration settings...</span>
      </div>
    )
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Settings</h1>
          <p className="text-gray-600 mt-1">
            Connect VeeKaart and other e-commerce platforms with EzBillify
          </p>
        </div>
        
        <Button onClick={loadApiKeys} variant="outline" disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* API Keys Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Key className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">EzBillify API Credentials</h3>
              <p className="text-gray-600 text-sm">
                Use these credentials to connect VeeKaart and other e-commerce platforms to EzBillify
              </p>
            </div>
          </div>
          
          <Button
            onClick={generateNewApiKey}
            loading={regenerating}
            disabled={regenerating}
            variant="outline"
            className="text-blue-600"
          >
            {regenerating ? 'Generating...' : 'Regenerate Keys'}
          </Button>
        </div>

        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
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

          {/* Webhook Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook Secret
            </label>
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
              <h3 className="text-lg font-semibold text-gray-900">VeeKaart E-commerce</h3>
              <p className="text-gray-600 text-sm">
                Connect your VeeKaart store for automatic order processing and inventory sync
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-sm text-green-600">Ready to Connect</span>
          </div>
        </div>

        {/* Connection Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-3">Setup Instructions</h4>
          <ol className="text-sm text-blue-800 space-y-2">
            <li>1. Copy the API Key and Webhook Secret from above</li>
            <li>2. Go to VeeKaart Admin → Settings → API Configuration</li>
            <li>3. Paste the credentials and configure webhook URLs below</li>
            <li>4. Enable automatic synchronization</li>
          </ol>
        </div>

        {/* Webhook URLs */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Webhook URLs for VeeKaart</h4>
          
          {[
            { label: 'Orders Webhook', endpoint: '/api/webhooks/veekaart/orders', description: 'New orders from VeeKaart' },
            { label: 'Customers Webhook', endpoint: '/api/webhooks/veekaart/customers', description: 'Customer data from VeeKaart' },
            { label: 'Products Webhook', endpoint: '/api/webhooks/veekaart/products', description: 'Product sync confirmations' }
          ].map((webhook) => (
            <div key={webhook.endpoint} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{webhook.label}</div>
                <div className="text-sm text-gray-600">{webhook.description}</div>
              </div>
              <div className="flex items-center space-x-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                  {baseUrl}{webhook.endpoint}
                </code>
                <Button
                  onClick={() => copyToClipboard(`${baseUrl}${webhook.endpoint}`, webhook.label)}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Test Connection */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Test Connection</h4>
              <p className="text-sm text-gray-600">
                Once configured in VeeKaart, test the connection here
              </p>
            </div>
            <Button variant="outline" className="text-green-600">
              Test Connection
            </Button>
          </div>
        </div>
      </Card>

      {/* Sync Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Synchronization Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="text-2xl mb-2">📦</div>
            <h4 className="font-medium text-gray-900">Products</h4>
            <p className="text-sm text-gray-600 mt-1">EzBillify → VeeKaart</p>
            <div className="mt-2">
              <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                Auto-sync enabled
              </span>
            </div>
          </div>
          
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="text-2xl mb-2">📋</div>
            <h4 className="font-medium text-gray-900">Orders</h4>
            <p className="text-sm text-gray-600 mt-1">VeeKaart → EzBillify</p>
            <div className="mt-2">
              <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                Auto-sync enabled
              </span>
            </div>
          </div>
          
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <div className="text-2xl mb-2">👥</div>
            <h4 className="font-medium text-gray-900">Customers</h4>
            <p className="text-sm text-gray-600 mt-1">VeeKaart → EzBillify</p>
            <div className="mt-2">
              <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                Auto-sync enabled
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Documentation Link */}
      <Card className="p-6 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Need Help?</h4>
            <p className="text-sm text-gray-600 mt-1">
              Check our integration guide for step-by-step setup instructions
            </p>
          </div>
          <Button variant="outline" className="text-blue-600">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Documentation
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default IntegrationSettings