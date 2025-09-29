// src/components/others/DataExport.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'
import { 
  Download, 
  Upload, 
  FileText, 
  Database, 
  Calendar,
  Users,
  Package,
  CreditCard,
  FileSpreadsheet,
  Archive,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Filter,
  Eye
} from 'lucide-react'

const DataExport = () => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [exportHistory, setExportHistory] = useState([])
  const [selectedExportType, setSelectedExportType] = useState('all')
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [exportFormat, setExportFormat] = useState('xlsx')
  const [includeDeleted, setIncludeDeleted] = useState(false)

  // Export options based on your schema
  const exportOptions = [
    {
      id: 'all',
      name: 'Complete Backup',
      description: 'Export all company data including settings',
      icon: Database,
      tables: ['customers', 'vendors', 'items', 'sales_documents', 'purchase_documents', 'payments', 'chart_of_accounts'],
      estimatedSize: '15-50 MB'
    },
    {
      id: 'customers',
      name: 'Customers',
      description: 'Customer master data, addresses, and contact info',
      icon: Users,
      tables: ['customers'],
      estimatedSize: '1-5 MB'
    },
    {
      id: 'vendors',
      name: 'Vendors',
      description: 'Vendor master data and payment terms',
      icon: Users,
      tables: ['vendors'],
      estimatedSize: '1-3 MB'
    },
    {
      id: 'items',
      name: 'Items & Inventory',
      description: 'Product catalog, pricing, and stock levels',
      icon: Package,
      tables: ['items', 'inventory_movements'],
      estimatedSize: '2-10 MB'
    },
    {
      id: 'sales',
      name: 'Sales Documents',
      description: 'Invoices, quotations, and sales orders',
      icon: FileText,
      tables: ['sales_documents', 'sales_document_items'],
      estimatedSize: '5-25 MB'
    },
    {
      id: 'purchases',
      name: 'Purchase Documents',
      description: 'Bills, purchase orders, and expenses',
      icon: FileText,
      tables: ['purchase_documents', 'purchase_document_items'],
      estimatedSize: '3-15 MB'
    },
    {
      id: 'payments',
      name: 'Payments',
      description: 'Payment received, made, and allocations',
      icon: CreditCard,
      tables: ['payments', 'payment_allocations'],
      estimatedSize: '2-8 MB'
    },
    {
      id: 'accounting',
      name: 'Accounting Data',
      description: 'Chart of accounts and journal entries',
      icon: FileSpreadsheet,
      tables: ['chart_of_accounts', 'journal_entries', 'journal_entry_items'],
      estimatedSize: '3-12 MB'
    },
    {
      id: 'gst',
      name: 'GST & Tax Data',
      description: 'GST returns, e-way bills, and tax records',
      icon: Archive,
      tables: ['gst_returns', 'eway_bills', 'tax_rates'],
      estimatedSize: '1-5 MB'
    }
  ]

  const formatOptions = [
    { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
    { value: 'csv', label: 'CSV Files', icon: FileText },
    { value: 'json', label: 'JSON Data', icon: Database },
    { value: 'pdf', label: 'PDF Report', icon: FileText }
  ]

  useEffect(() => {
    loadExportHistory()
    setDefaultDateRange()
  }, [company])

  const setDefaultDateRange = () => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    
    // Set financial year dates (April to March)
    let fyStart, fyEnd
    if (currentMonth >= 3) { // April to March (months 0-indexed)
      fyStart = new Date(currentYear, 3, 1) // April 1st current year
      fyEnd = new Date(currentYear + 1, 2, 31) // March 31st next year
    } else {
      fyStart = new Date(currentYear - 1, 3, 1) // April 1st previous year
      fyEnd = new Date(currentYear, 2, 31) // March 31st current year
    }
    
    setDateRange({
      startDate: fyStart.toISOString().split('T')[0],
      endDate: fyEnd.toISOString().split('T')[0]
    })
  }

  const loadExportHistory = async () => {
    if (!company?.id) return
    
    try {
      const response = await fetch(`/api/data/export-history?company_id=${company.id}`)
      if (response.ok) {
        const result = await response.json()
        setExportHistory(result.data || [])
      }
    } catch (err) {
      console.error('Error loading export history:', err)
    }
  }

  const handleExport = async () => {
    if (!company?.id) {
      error('Company information not available')
      return
    }

    if (!selectedExportType) {
      error('Please select an export type')
      return
    }

    setLoading(true)

    try {
      const exportData = {
        company_id: company.id,
        export_type: selectedExportType,
        format: exportFormat,
        date_range: dateRange,
        include_deleted: includeDeleted,
        requested_at: new Date().toISOString()
      }

      const response = await fetch('/api/data/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportData)
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        if (result.download_url) {
          // Immediate download
          const link = document.createElement('a')
          link.href = result.download_url
          link.download = result.filename || 'export.xlsx'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          success('Data export completed successfully')
        } else {
          // Async export - will be processed in background
          success('Export request submitted. You will receive an email when ready.')
        }
        
        // Refresh export history
        await loadExportHistory()
      } else {
        error(result.error || 'Export failed')
      }
    } catch (err) {
      console.error('Export error:', err)
      error('Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const downloadHistoryItem = (historyItem) => {
    if (historyItem.download_url) {
      window.open(historyItem.download_url, '_blank')
    } else {
      error('Download link no longer available')
    }
  }

  const getSelectedExportInfo = () => {
    return exportOptions.find(option => option.id === selectedExportType)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Export & Backup</h1>
          <p className="text-gray-600 mt-1">
            Export your business data for backup, migration, or analysis
          </p>
        </div>
        
        <Button
          onClick={() => loadExportHistory()}
          variant="outline"
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Export Configuration */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Export Type Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Data to Export</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exportOptions.map(option => {
                const IconComponent = option.icon
                const isSelected = selectedExportType === option.id
                
                return (
                  <div
                    key={option.id}
                    onClick={() => setSelectedExportType(option.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <IconComponent className="w-5 h-5 mr-2 text-blue-600" />
                      <h4 className="font-medium text-gray-900">{option.name}</h4>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{option.tables.length} table{option.tables.length > 1 ? 's' : ''}</span>
                      <span>{option.estimatedSize}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Export Options */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
            
            <div className="space-y-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range (Optional)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {formatOptions.map(format => {
                    const IconComponent = format.icon
                    const isSelected = exportFormat === format.value
                    
                    return (
                      <div
                        key={format.value}
                        onClick={() => setExportFormat(format.value)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center">
                          <IconComponent className="w-4 h-4 mr-2 text-gray-600" />
                          <span className="text-sm font-medium">{format.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Additional Options */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeDeleted"
                    checked={includeDeleted}
                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="includeDeleted" className="ml-2 block text-sm text-gray-700">
                    Include deleted records
                  </label>
                </div>
              </div>
            </div>
          </Card>

          {/* Export Action */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Ready to Export</h4>
                {getSelectedExportInfo() && (
                  <p className="text-sm text-gray-600 mt-1">
                    Exporting: {getSelectedExportInfo().name} as {formatOptions.find(f => f.value === exportFormat)?.label}
                  </p>
                )}
              </div>
              
              <Button
                onClick={handleExport}
                loading={loading}
                disabled={loading || !selectedExportType}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                {loading ? 'Exporting...' : 'Start Export'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Export History & Info */}
        <div className="space-y-6">
          
          {/* Export History */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Exports</h3>
            
            {exportHistory.length > 0 ? (
              <div className="space-y-3">
                {exportHistory.slice(0, 5).map(item => (
                  <div key={item.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {item.export_type}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        {item.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : item.status === 'failed' ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Format: {item.format?.toUpperCase()}</div>
                      <div>Size: {formatFileSize(item.file_size || 0)}</div>
                      <div>Created: {formatDate(item.created_at)}</div>
                    </div>
                    
                    {item.status === 'completed' && item.download_url && (
                      <Button
                        onClick={() => downloadHistoryItem(item)}
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Archive className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No exports yet</p>
              </div>
            )}
          </Card>

          {/* Export Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Information</h3>
            
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <Settings className="w-4 h-4 mr-2 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Data Security</p>
                  <p>All exports are encrypted and secured. Download links expire after 7 days.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="w-4 h-4 mr-2 mt-0.5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Processing Time</p>
                  <p>Small exports complete instantly. Large exports may take 5-10 minutes.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Filter className="w-4 h-4 mr-2 mt-0.5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Date Filtering</p>
                  <p>Date filters apply to transactional data only, not master data.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DataExport