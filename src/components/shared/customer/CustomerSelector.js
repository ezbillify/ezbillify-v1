// src/components/shared/customer/CustomerSelector.js - REUSABLE MINIMAL
import React from 'react'
import { Phone, FileText, Users } from 'lucide-react'

export const CustomerSelector = ({
  customerSearch,
  setCustomerSearch,
  showDropdown,
  setShowDropdown,
  filteredCustomers,
  onSelect,
  selectedCustomer
}) => {
  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Select Customer
        </label>
        <input
          type="text"
          placeholder="Search name, code, or phone..."
          value={customerSearch}
          onChange={(e) => {
            setCustomerSearch(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Dropdown */}
        {showDropdown && filteredCustomers.length > 0 && (
          <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-auto shadow-lg">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => onSelect(customer)}
                className="p-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
              >
                {/* Name & Type */}
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm text-gray-900">{customer.name}</div>
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                    customer.customer_type === 'b2b'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {customer.customer_type === 'b2b' ? 'B2B' : 'B2C'}
                  </span>
                </div>

                {/* Code & Info Row */}
                <div className="text-xs text-gray-600 space-y-0.5">
                  <div>{customer.customer_code}</div>
                  
                  {/* Phone for both */}
                  {customer.phone && (
                    <div className="flex items-center gap-1 text-gray-700">
                      <span>📱</span>
                      {customer.phone}
                    </div>
                  )}

                  {/* GSTIN for B2B */}
                  {customer.customer_type === 'b2b' && customer.gstin && (
                    <div className="flex items-center gap-1 text-blue-600 font-mono text-xs">
                      <span>📄</span>
                      {customer.gstin}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Customer Display */}
      {selectedCustomer && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          {/* Header */}
          <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{selectedCustomer.name}</div>
                <div className="text-xs text-gray-600">{selectedCustomer.customer_code}</div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                selectedCustomer.customer_type === 'b2b'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {selectedCustomer.customer_type === 'b2b' ? 'B2B' : 'B2C'}
              </span>
            </div>
          </div>

          {/* Phone */}
          {selectedCustomer.phone && (
            <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-lg text-sm">
              <span className="text-gray-500">📱</span>
              <span className="text-gray-900 font-medium">{selectedCustomer.phone}</span>
            </div>
          )}

          {/* B2B Info */}
          {selectedCustomer.customer_type === 'b2b' && (
            <>
              {selectedCustomer.company_name && (
                <div className="px-2.5 py-2 bg-gray-50 rounded-lg text-sm">
                  <div className="text-xs text-gray-600 font-medium mb-0.5">Company</div>
                  <div className="text-gray-900 font-medium text-sm">{selectedCustomer.company_name}</div>
                </div>
              )}

              {selectedCustomer.gstin && (
                <div className="flex items-start gap-2 px-2.5 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-blue-600 text-lg flex-shrink-0">📄</span>
                  <div className="flex-1">
                    <div className="text-xs text-blue-700 font-semibold mb-0.5">GSTIN</div>
                    <div className="text-blue-900 font-mono font-bold text-xs break-all">{selectedCustomer.gstin}</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* B2C: Email */}
          {selectedCustomer.customer_type === 'b2c' && selectedCustomer.email && (
            <div className="px-2.5 py-2 bg-gray-50 rounded-lg text-sm">
              <div className="text-xs text-gray-600 mb-0.5">Email</div>
              <div className="text-gray-900 break-all text-xs">{selectedCustomer.email}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomerSelector