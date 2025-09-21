// src/components/shared/data-display/SearchFilter.js
import React, { useState, useEffect } from 'react'
import { SearchInput } from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

const SearchFilter = ({
  onSearch,
  onFilterChange,
  searchPlaceholder = 'Search...',
  filters = [],
  showClearAll = true,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState({})
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    onSearch && onSearch(searchTerm)
  }, [searchTerm, onSearch])

  useEffect(() => {
    onFilterChange && onFilterChange(activeFilters)
  }, [activeFilters, onFilterChange])

  const handleFilterChange = (filterKey, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value
    }))
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setActiveFilters({})
  }

  const hasActiveFilters = searchTerm || Object.values(activeFilters).some(value => value)

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {/* Search Bar */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <SearchInput
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={onSearch}
            />
          </div>
          
          {filters.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              icon={
                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              }
            >
              Filters
            </Button>
          )}
          
          {showClearAll && hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Options */}
      {isExpanded && filters.length > 0 && (
        <div className="p-4 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <Select
                  label={filter.label}
                  options={[
                    { value: '', label: `All ${filter.label}` },
                    ...filter.options
                  ]}
                  value={activeFilters[filter.key] || ''}
                  onChange={(value) => handleFilterChange(filter.key, value)}
                  searchable={filter.searchable}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="p-4 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Active filters:</span>
            
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </span>
            )}

            {Object.entries(activeFilters).map(([key, value]) => {
              if (!value) return null
              const filter = filters.find(f => f.key === key)
              const option = filter?.options.find(o => o.value === value)
              
              return (
                <span
                  key={key}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
                >
                  {filter?.label}: {option?.label || value}
                  <button
                    onClick={() => handleFilterChange(key, '')}
                    className="ml-2 text-emerald-600 hover:text-emerald-800"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Specialized Search Filters for EzBillify
export const InvoiceSearchFilter = ({ onSearch, onFilterChange }) => {
  const filters = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'paid', label: 'Paid' },
        { value: 'overdue', label: 'Overdue' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    },
    {
      key: 'customer_type',
      label: 'Customer Type',
      options: [
        { value: 'b2b', label: 'B2B' },
        { value: 'b2c', label: 'B2C' }
      ]
    },
    {
      key: 'payment_status',
      label: 'Payment Status',
      options: [
        { value: 'paid', label: 'Paid' },
        { value: 'unpaid', label: 'Unpaid' },
        { value: 'partial', label: 'Partially Paid' }
      ]
    },
    {
      key: 'date_range',
      label: 'Date Range',
      options: [
        { value: 'today', label: 'Today' },
        { value: 'this_week', label: 'This Week' },
        { value: 'this_month', label: 'This Month' },
        { value: 'last_month', label: 'Last Month' },
        { value: 'this_quarter', label: 'This Quarter' },
        { value: 'this_year', label: 'This Year' }
      ]
    }
  ]

  return (
    <SearchFilter
      onSearch={onSearch}
      onFilterChange={onFilterChange}
      searchPlaceholder="Search invoices..."
      filters={filters}
    />
  )
}

export const CustomerSearchFilter = ({ onSearch, onFilterChange }) => {
  const filters = [
    {
      key: 'customer_type',
      label: 'Customer Type',
      options: [
        { value: 'b2b', label: 'B2B' },
        { value: 'b2c', label: 'B2C' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      key: 'has_gstin',
      label: 'GSTIN',
      options: [
        { value: 'yes', label: 'Has GSTIN' },
        { value: 'no', label: 'No GSTIN' }
      ]
    }
  ]

  return (
    <SearchFilter
      onSearch={onSearch}
      onFilterChange={onFilterChange}
      searchPlaceholder="Search customers..."
      filters={filters}
    />
  )
}

export default SearchFilter
