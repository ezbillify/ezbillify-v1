// src/components/shared/customer/CustomerDisplay.js - MINIMAL & INFORMATIVE
import React from 'react'
import { Users, Phone, FileText, MapPin } from 'lucide-react'

const CustomerDisplay = ({ customer, gstType }) => {
  if (!customer) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center text-sm text-gray-500">
        No customer selected
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Customer Name & Type */}
      <div className="bg-white p-3 rounded-lg border border-blue-200 bg-blue-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-sm">
              {customer.name}
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {customer.customer_code}
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
            customer.customer_type === 'b2b'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {customer.customer_type === 'b2b' ? 'B2B' : 'B2C'}
          </span>
        </div>
      </div>

      {/* Contact Info - Phone for both */}
      {customer.phone && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
          <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-gray-900 font-medium">{customer.phone}</span>
        </div>
      )}

      {/* B2B: Show Company Name & GSTIN */}
      {customer.customer_type === 'b2b' && (
        <div className="space-y-2">
          {customer.company_name && (
            <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
              <div className="text-xs text-gray-600 mb-0.5">Company</div>
              <div className="text-gray-900 font-medium">{customer.company_name}</div>
            </div>
          )}

          {customer.gstin && (
            <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 text-sm">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs text-blue-700 mb-0.5 font-medium">GSTIN</div>
                <div className="text-blue-900 font-mono font-semibold">{customer.gstin}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* B2C: Just Phone (already shown above) */}
      {customer.customer_type === 'b2c' && customer.email && (
        <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
          <div className="text-xs text-gray-600 mb-0.5">Email</div>
          <div className="text-gray-900 break-all">{customer.email}</div>
        </div>
      )}

      {/* Address */}
      {customer.billing_address && customer.billing_address.address_line1 && (
        <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
          <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-gray-900">
              {customer.billing_address.address_line1}
            </div>
            {(customer.billing_address.city || customer.billing_address.state) && (
              <div className="text-xs text-gray-600 mt-0.5">
                {customer.billing_address.city}
                {customer.billing_address.city && customer.billing_address.state ? ', ' : ''}
                {customer.billing_address.state}
                {customer.billing_address.pincode ? ` - ${customer.billing_address.pincode}` : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GST Type Info */}
      {gstType && (
        <div className={`px-3 py-2 rounded-lg border text-sm ${
          gstType === 'intrastate'
            ? 'bg-green-50 border-green-200'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className={`font-medium text-xs mb-0.5 ${
            gstType === 'intrastate' ? 'text-green-700' : 'text-orange-700'
          }`}>
            {gstType === 'intrastate' ? '✓ Intrastate (CGST+SGST)' : '✓ Interstate (IGST)'}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerDisplay