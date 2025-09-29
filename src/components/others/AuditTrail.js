// src/components/others/AuditTrail.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'
import { 
  Eye, 
  Search, 
  Filter, 
  Download,
  Calendar,
  User,
  Activity,
  Shield,
  AlertTriangle,
  Clock,
  FileText,
  Edit,
  Trash2,
  Plus,
  Settings,
  Database,
  RefreshCw,
  ChevronRight,
  Info
} from 'lucide-react'

const AuditTrail = () => {
  const { company, user } = useAuth()
  const { error } = useToast()
  const [loading, setLoading] = useState(true)
  const [auditLogs, setAuditLogs] = useState([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50)
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    resource_type: '',
    date_from: '',
    date_to: '',
    search: ''
  })
  const [selectedLog, setSelectedLog] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // Action types from your audit system
  const actionTypes = [
    { value: 'create', label: 'Create', icon: Plus, color: 'text-green-600' },
    { value: 'update', label: 'Update', icon: Edit, color: 'text-blue-600' },
    { value: 'delete', label: 'Delete', icon: Trash2, color: 'text-red-600' },
    { value: 'view', label: 'View', icon: Eye, color: 'text-gray-600' },
    { value: 'login', label: 'Login', icon: User, color: 'text-purple-600' },
    { value: 'logout', label: 'Logout', icon: User, color: 'text-gray-600' },
    { value: 'export', label: 'Export', icon: Download, color: 'text-indigo-600' },
    { value: 'import', label: 'Import', icon: Upload, color: 'text-orange-600' },
    { value: 'settings', label: 'Settings', icon: Settings, color: 'text-yellow-600' }
  ]

  // Resource types from your schema
  const resourceTypes = [
    { value: 'customer', label: 'Customers' },
    { value: 'vendor', label: 'Vendors' },
    { value: 'item', label: 'Items' },
    { value: 'sales_document', label: 'Sales Documents' },
    { value: 'purchase_document', label: 'Purchase Documents' },
    { value: 'payment', label: 'Payments' },
    { value: 'journal_entry', label: 'Journal Entries' },
    { value: 'user', label: 'Users' },
    { value: 'company', label: 'Company Settings' },
    { value: 'tax_rate', label: 'Tax Rates' },
    { value: 'bank_account', label: 'Bank Accounts' },
    { value: 'chart_of_accounts', label: 'Chart of Accounts' }
  ]

  useEffect(() => {
    loadAuditLogs()
    setDefaultDateRange()
  }, [company, currentPage, filters])

  const setDefaultDateRange = () => {
    if (!filters.date_from && !filters.date_to) {
      const today = new Date()
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      setFilters(prev => ({
        ...prev,
        date_from: lastWeek.toISOString().split('T')[0],
        date_to: today.toISOString().split('T')[0]
      }))
    }
  }

  const loadAuditLogs = async () => {
    if (!company?.id) return
    
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        company_id: company.id,
        page: currentPage,
        page_size: pageSize,
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      })

      const response = await fetch(`/api/audit/logs?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load audit logs: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setAuditLogs(result.data || [])
        setTotalLogs(result.total || 0)
      } else {
        error(result.error || 'Failed to load audit logs')
      }
    } catch (err) {
      console.error('Error loading audit logs:', err)
      error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const clearFilters = () => {
    setFilters({
      user_id: '',
      action: '',
      resource_type: '',
      date_from: '',
      date_to: '',
      search: ''
    })
    setCurrentPage(1)
  }

  const exportAuditLogs = async () => {
    try {
      const queryParams = new URLSearchParams({
        company_id: company.id,
        export: 'true',
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value))
      })

      const response = await fetch(`/api/audit/logs/export?${queryParams}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Export error:', err)
      error('Failed to export audit logs')
    }
  }

  const getActionInfo = (action) => {
    return actionTypes.find(a => a.value === action) || { 
      value: action, 
      label: action, 
      icon: Activity, 
      color: 'text-gray-600' 
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatJsonData = (jsonData) => {
    if (!jsonData) return 'N/A'
    try {
      return JSON.stringify(jsonData, null, 2)
    } catch {
      return String(jsonData)
    }
  }

  const totalPages = Math.ceil(totalLogs / pageSize)

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600 mt-1">
            Track all user activities and system changes for compliance and security
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className={showFilters ? 'bg-blue-50 border-blue-300' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <Button
            onClick={exportAuditLogs}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Button
            onClick={loadAuditLogs}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search descriptions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Actions</option>
                {actionTypes.map(action => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type
              </label>
              <select
                value={filters.resource_type}
                onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Resources</option>
                {resourceTypes.map(resource => (
                  <option key={resource.value} value={resource.value}>
                    {resource.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
            >
              Clear Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Audit Logs List */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Activity Log ({totalLogs.toLocaleString()} entries)
              </h3>
              
              {loading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              )}
            </div>

            {loading && auditLogs.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading audit logs...</p>
                </div>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No audit logs found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map(log => {
                  const actionInfo = getActionInfo(log.action)
                  const ActionIcon = actionInfo.icon
                  
                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-full bg-gray-100 ${actionInfo.color}`}>
                            <ActionIcon className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {log.user_email || 'System'}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${actionInfo.color} bg-opacity-10`}>
                                {actionInfo.label}
                              </span>
                              <span className="text-sm text-gray-500">
                                {log.resource_type}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {log.description || `${actionInfo.label} ${log.resource_type} ${log.resource_identifier || ''}`}
                            </p>
                            
                            <div className="flex items-center text-xs text-gray-500 space-x-4">
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDate(log.created_at)}
                              </div>
                              
                              {log.ip_address && (
                                <div className="flex items-center">
                                  <Shield className="w-3 h-3 mr-1" />
                                  {log.ip_address}
                                </div>
                              )}
                              
                              {log.resource_identifier && (
                                <div className="flex items-center">
                                  <Database className="w-3 h-3 mr-1" />
                                  {log.resource_identifier}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages} 
                  <span className="ml-2">
                    ({(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalLogs)} of {totalLogs})
                  </span>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  
                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Log Details & Summary */}
        <div className="space-y-6">
          
          {/* Selected Log Details */}
          {selectedLog && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Log Details</h3>
                <Button
                  onClick={() => setSelectedLog(null)}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action
                  </label>
                  <div className="flex items-center">
                    {React.createElement(getActionInfo(selectedLog.action).icon, {
                      className: `w-4 h-4 mr-2 ${getActionInfo(selectedLog.action).color}`
                    })}
                    <span className="text-sm">{getActionInfo(selectedLog.action).label}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User
                  </label>
                  <p className="text-sm text-gray-900">{selectedLog.user_email || 'System'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resource
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedLog.resource_type} {selectedLog.resource_identifier && `(${selectedLog.resource_identifier})`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timestamp
                  </label>
                  <p className="text-sm text-gray-900">{formatDate(selectedLog.created_at)}</p>
                </div>

                {selectedLog.ip_address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IP Address
                    </label>
                    <p className="text-sm text-gray-900">{selectedLog.ip_address}</p>
                  </div>
                )}

                {selectedLog.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <p className="text-sm text-gray-900">{selectedLog.description}</p>
                  </div>
                )}

                {selectedLog.old_values && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Old Values
                    </label>
                    <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-32">
                      {formatJsonData(selectedLog.old_values)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_values && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Values
                    </label>
                    <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-32">
                      {formatJsonData(selectedLog.new_values)}
                    </pre>
                  </div>
                )}

                {selectedLog.changes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Changes
                    </label>
                    <pre className="text-xs bg-blue-50 p-3 rounded border overflow-auto max-h-32">
                      {formatJsonData(selectedLog.changes)}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Audit Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Entries:</span>
                <span className="font-medium">{totalLogs.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Date Range:</span>
                <span className="font-medium text-xs">
                  {filters.date_from || 'All'} to {filters.date_to || 'All'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Active Filters:</span>
                <span className="font-medium">
                  {Object.values(filters).filter(v => v).length}
                </span>
              </div>
            </div>
          </Card>

          {/* Security Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security & Compliance</h3>
            
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <Shield className="w-4 h-4 mr-2 mt-0.5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Data Integrity</p>
                  <p>All audit logs are immutable and cryptographically secured.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="w-4 h-4 mr-2 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Retention Policy</p>
                  <p>Audit logs are retained for 7 years for compliance purposes.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Info className="w-4 h-4 mr-2 mt-0.5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Real-time Tracking</p>
                  <p>All system activities are logged in real-time for immediate monitoring.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AuditTrail