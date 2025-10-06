// src/components/purchase/VendorLedger.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Badge from '../shared/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';

const VendorLedger = ({ vendorId, companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [vendor, setVendor] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (vendorId && companyId) {
      fetchVendor();
      fetchTransactions();
    }
  }, [vendorId, companyId]);

  const fetchVendor = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/vendors/${vendorId}?company_id=${companyId}`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setVendor(result.data);
    }
  };

  const fetchTransactions = async () => {
    // This would fetch actual transactions when you have the API
    // For now, we'll just show vendor details
    setTransactions([]);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      inactive: 'warning',
      blocked: 'error',
      on_hold: 'default'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading vendor details...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-800">Vendor not found</h3>
        <p className="text-slate-600 mt-2">The vendor you're looking for doesn't exist.</p>
        <Button
          className="mt-4"
          onClick={() => router.push('/purchase/vendors')}
        >
          Back to Vendors
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {vendor.display_name || vendor.vendor_name}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Code: {vendor.vendor_code}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(vendor.status)}
            <Button
              variant="primary"
              onClick={() => router.push(`/purchase/vendors/${vendorId}/edit`)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            >
              Edit
            </Button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Opening Balance</p>
            <p className={`text-2xl font-bold mt-1 ${
              vendor.opening_balance_type === 'payable' ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(vendor.opening_balance)}
            </p>
            <p className="text-xs text-slate-600 mt-1 capitalize">{vendor.opening_balance_type}</p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Current Balance</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(vendor.current_balance || 0)}
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-600 font-medium">Credit Limit</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {formatCurrency(vendor.credit_limit || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Basic Information</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Vendor Name</p>
              <p className="text-base font-medium text-slate-900">{vendor.vendor_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Display Name</p>
              <p className="text-base font-medium text-slate-900">{vendor.display_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Vendor Type</p>
              <p className="text-base font-medium text-slate-900 uppercase">{vendor.vendor_type || 'B2B'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Business Type</p>
              <p className="text-base font-medium text-slate-900 capitalize">{vendor.business_type?.replace('_', ' ') || '-'}</p>
            </div>
            {vendor.vendor_category && (
              <div>
                <p className="text-sm text-slate-500">Category</p>
                <p className="text-base font-medium text-slate-900">{vendor.vendor_category}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Contact Information</h3>
          <div className="space-y-3">
            {vendor.email && (
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="text-base font-medium text-slate-900">{vendor.email}</p>
              </div>
            )}
            {vendor.phone && (
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="text-base font-medium text-slate-900">{vendor.phone}</p>
              </div>
            )}
            {vendor.mobile && (
              <div>
                <p className="text-sm text-slate-500">Mobile</p>
                <p className="text-base font-medium text-slate-900">{vendor.mobile}</p>
              </div>
            )}
            {vendor.alternate_phone && (
              <div>
                <p className="text-sm text-slate-500">Alternate Phone</p>
                <p className="text-base font-medium text-slate-900">{vendor.alternate_phone}</p>
              </div>
            )}
            {vendor.website && (
              <div>
                <p className="text-sm text-slate-500">Website</p>
                <p className="text-base font-medium text-slate-900">
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {vendor.website}
                  </a>
                </p>
              </div>
            )}
            {vendor.contact_person && (
              <div>
                <p className="text-sm text-slate-500">Contact Person</p>
                <p className="text-base font-medium text-slate-900">
                  {vendor.contact_person}
                  {vendor.designation && <span className="text-slate-600"> ({vendor.designation})</span>}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Tax Information</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">GSTIN</p>
              <p className="text-base font-medium text-slate-900 font-mono">{vendor.gstin || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">PAN</p>
              <p className="text-base font-medium text-slate-900 font-mono">{vendor.pan || '-'}</p>
            </div>
            {vendor.tan && (
              <div>
                <p className="text-sm text-slate-500">TAN</p>
                <p className="text-base font-medium text-slate-900 font-mono">{vendor.tan}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-slate-500">Tax Preference</p>
              <p className="text-base font-medium text-slate-900 capitalize">{vendor.tax_preference?.replace('_', ' ') || 'Taxable'}</p>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Payment Terms</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-500">Payment Terms</p>
              <p className="text-base font-medium text-slate-900">
                {vendor.payment_terms ? `Net ${vendor.payment_terms} Days` : 'Immediate'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Credit Limit</p>
              <p className="text-base font-medium text-slate-900">{formatCurrency(vendor.credit_limit || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing Address */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Billing Address</h3>
          {vendor.billing_address && Object.keys(vendor.billing_address).length > 0 ? (
            <div className="text-sm text-slate-600 space-y-1">
              {vendor.billing_address.address_line1 && <p>{vendor.billing_address.address_line1}</p>}
              {vendor.billing_address.address_line2 && <p>{vendor.billing_address.address_line2}</p>}
              {vendor.billing_address.city && vendor.billing_address.state && (
                <p>{vendor.billing_address.city}, {vendor.billing_address.state}</p>
              )}
              {vendor.billing_address.pincode && <p>{vendor.billing_address.pincode}</p>}
              {vendor.billing_address.country && <p>{vendor.billing_address.country}</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No billing address added</p>
          )}
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Shipping Address
            {vendor.same_as_billing && (
              <span className="ml-2 text-xs text-slate-500">(Same as billing)</span>
            )}
          </h3>
          {vendor.shipping_address && Object.keys(vendor.shipping_address).length > 0 ? (
            <div className="text-sm text-slate-600 space-y-1">
              {vendor.shipping_address.address_line1 && <p>{vendor.shipping_address.address_line1}</p>}
              {vendor.shipping_address.address_line2 && <p>{vendor.shipping_address.address_line2}</p>}
              {vendor.shipping_address.city && vendor.shipping_address.state && (
                <p>{vendor.shipping_address.city}, {vendor.shipping_address.state}</p>
              )}
              {vendor.shipping_address.pincode && <p>{vendor.shipping_address.pincode}</p>}
              {vendor.shipping_address.country && <p>{vendor.shipping_address.country}</p>}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No shipping address added</p>
          )}
        </div>
      </div>

      {/* Bank Details */}
      {vendor.bank_details && Object.keys(vendor.bank_details).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendor.bank_details.account_holder_name && (
              <div>
                <p className="text-sm text-slate-500">Account Holder Name</p>
                <p className="text-base font-medium text-slate-900">{vendor.bank_details.account_holder_name}</p>
              </div>
            )}
            {vendor.bank_details.account_number && (
              <div>
                <p className="text-sm text-slate-500">Account Number</p>
                <p className="text-base font-medium text-slate-900 font-mono">{vendor.bank_details.account_number}</p>
              </div>
            )}
            {vendor.bank_details.ifsc_code && (
              <div>
                <p className="text-sm text-slate-500">IFSC Code</p>
                <p className="text-base font-medium text-slate-900 font-mono">{vendor.bank_details.ifsc_code}</p>
              </div>
            )}
            {vendor.bank_details.bank_name && (
              <div>
                <p className="text-sm text-slate-500">Bank Name</p>
                <p className="text-base font-medium text-slate-900">{vendor.bank_details.bank_name}</p>
              </div>
            )}
            {vendor.bank_details.branch && (
              <div>
                <p className="text-sm text-slate-500">Branch</p>
                <p className="text-base font-medium text-slate-900">{vendor.bank_details.branch}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {vendor.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Additional Notes</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{vendor.notes}</p>
        </div>
      )}
    </div>
  );
};

export default VendorLedger;