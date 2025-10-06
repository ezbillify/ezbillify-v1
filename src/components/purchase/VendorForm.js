// src/components/purchase/VendorForm.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input, { EmailInput, PhoneInput, GSTInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import AddressForm from '../shared/forms/AddressForm';

const VendorForm = ({ vendorId, companyId, onComplete }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, error, executeRequest, authenticatedFetch } = useAPI();

  const [formData, setFormData] = useState({
    vendor_name: '',
    display_name: '',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    contact_person: '',
    designation: '',
    gstin: '',
    pan: '',
    tan: '',
    business_type: 'proprietorship',
    billing_address: {
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    shipping_address: {
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    credit_limit: '',
    payment_terms: 30,
    tax_preference: 'taxable',
    bank_details: {
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      bank_name: '',
      branch: ''
    },
    opening_balance: '',
    opening_balance_type: 'credit',
    vendor_category: '',
    notes: ''
  });

  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [paymentTermsList, setPaymentTermsList] = useState([]);

  useEffect(() => {
    if (companyId) {
      fetchPaymentTerms();
    }
    if (vendorId) {
      fetchVendor();
    }
  }, [vendorId, companyId]);

  useEffect(() => {
    if (sameAsBilling) {
      setFormData(prev => ({
        ...prev,
        shipping_address: { ...prev.billing_address }
      }));
    }
  }, [sameAsBilling, formData.billing_address]);

  const fetchPaymentTerms = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/master-data/payment-terms?company_id=${companyId}&is_active=true`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setPaymentTermsList(result.data || []);
    }
  };

  const fetchVendor = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/vendors/${vendorId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const vendor = result.data;
      setFormData({
        ...formData,
        ...vendor,
        billing_address: vendor.billing_address || formData.billing_address,
        shipping_address: vendor.shipping_address || formData.shipping_address,
        bank_details: vendor.bank_details || formData.bank_details
      });
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleAddressChange = (type, field, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleBankDetailsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      bank_details: {
        ...prev.bank_details,
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.vendor_name.trim()) {
      errors.vendor_name = 'Vendor name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.gstin && formData.gstin.length !== 15) {
      errors.gstin = 'GSTIN must be 15 characters';
    }

    if (formData.pan && formData.pan.length !== 10) {
      errors.pan = 'PAN must be 10 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Please fix validation errors');
      return;
    }

    const apiCall = async () => {
      const url = vendorId ? `/api/vendors/${vendorId}` : '/api/vendors';
      const method = vendorId ? 'PUT' : 'POST';

      return await authenticatedFetch(url, {
        method,
        body: JSON.stringify(formData)
      });
    };

    const result = await executeRequest(apiCall);

    if (result.success) {
      success(vendorId ? 'Vendor updated successfully' : 'Vendor created successfully');
      if (onComplete) {
        onComplete(result.data);
      } else {
        router.push('/purchase/vendors');
      }
    }
  };

  const businessTypeOptions = [
    { value: 'proprietorship', label: 'Proprietorship' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'llp', label: 'LLP' },
    { value: 'private_limited', label: 'Private Limited' },
    { value: 'public_limited', label: 'Public Limited' },
    { value: 'trust', label: 'Trust' },
    { value: 'society', label: 'Society' }
  ];

  const taxPreferenceOptions = [
    { value: 'taxable', label: 'Taxable' },
    { value: 'tax_exempt', label: 'Tax Exempt' }
  ];

  const openingBalanceTypeOptions = [
    { value: 'credit', label: 'Credit (We Owe)' },
    { value: 'debit', label: 'Debit (They Owe)' }
  ];

  const paymentTermsOptions = paymentTermsList.map(term => ({
    value: term.term_days,
    label: `${term.term_name} (${term.term_days} days)`
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Basic Information</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Vendor Name"
            value={formData.vendor_name}
            onChange={(e) => handleChange('vendor_name', e.target.value)}
            error={validationErrors.vendor_name}
            required
            placeholder="Enter vendor name"
          />

          <Input
            label="Display Name"
            value={formData.display_name}
            onChange={(e) => handleChange('display_name', e.target.value)}
            placeholder="Display name (optional)"
            helperText="Leave empty to use vendor name"
          />

          <EmailInput
            label="Email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={validationErrors.email}
            placeholder="vendor@example.com"
          />

          <PhoneInput
            label="Phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+91 98765 43210"
          />

          <PhoneInput
            label="Mobile"
            value={formData.mobile}
            onChange={(e) => handleChange('mobile', e.target.value)}
            placeholder="+91 98765 43210"
          />

          <Input
            label="Website"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://example.com"
          />

          <Input
            label="Contact Person"
            value={formData.contact_person}
            onChange={(e) => handleChange('contact_person', e.target.value)}
            placeholder="Contact person name"
          />

          <Input
            label="Designation"
            value={formData.designation}
            onChange={(e) => handleChange('designation', e.target.value)}
            placeholder="Manager, Director, etc."
          />
        </div>
      </div>

      {/* Tax Information */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Tax Information</h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <GSTInput
            label="GSTIN"
            value={formData.gstin}
            onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
            error={validationErrors.gstin}
            placeholder="22AAAAA0000A1Z5"
          />

          <Input
            label="PAN"
            value={formData.pan}
            onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
            error={validationErrors.pan}
            maxLength={10}
            placeholder="ABCDE1234F"
          />

          <Input
            label="TAN"
            value={formData.tan}
            onChange={(e) => handleChange('tan', e.target.value.toUpperCase())}
            maxLength={10}
            placeholder="ABCD12345E"
          />

          <Select
            label="Business Type"
            value={formData.business_type}
            onChange={(value) => handleChange('business_type', value)}
            options={businessTypeOptions}
          />

          <Select
            label="Tax Preference"
            value={formData.tax_preference}
            onChange={(value) => handleChange('tax_preference', value)}
            options={taxPreferenceOptions}
          />

          <Input
            label="Vendor Category"
            value={formData.vendor_category}
            onChange={(e) => handleChange('vendor_category', e.target.value)}
            placeholder="Raw Material, Service, etc."
          />
        </div>
      </div>

      {/* Billing Address */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Billing Address</h3>
        <AddressForm
          address={formData.billing_address}
          onChange={(field, value) => handleAddressChange('billing_address', field, value)}
        />
      </div>

      {/* Shipping Address */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Shipping Address</h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={sameAsBilling}
              onChange={(e) => setSameAsBilling(e.target.checked)}
              className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">Same as billing address</span>
          </label>
        </div>
        <AddressForm
          address={formData.shipping_address}
          onChange={(field, value) => handleAddressChange('shipping_address', field, value)}
          disabled={sameAsBilling}
        />
      </div>

      {/* Payment & Credit Terms */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Payment & Credit Terms</h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <Select
            label="Payment Terms"
            value={formData.payment_terms}
            onChange={(value) => handleChange('payment_terms', parseInt(value))}
            options={paymentTermsOptions}
          />

          <Input
            label="Credit Limit"
            type="number"
            value={formData.credit_limit}
            onChange={(e) => handleChange('credit_limit', e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Opening Balance"
              type="number"
              value={formData.opening_balance}
              onChange={(e) => handleChange('opening_balance', e.target.value)}
              placeholder="0.00"
              step="0.01"
            />
            <Select
              label="Type"
              value={formData.opening_balance_type}
              onChange={(value) => handleChange('opening_balance_type', value)}
              options={openingBalanceTypeOptions}
            />
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Bank Details</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Account Holder Name"
            value={formData.bank_details.account_holder_name}
            onChange={(e) => handleBankDetailsChange('account_holder_name', e.target.value)}
            placeholder="Account holder name"
          />

          <Input
            label="Account Number"
            value={formData.bank_details.account_number}
            onChange={(e) => handleBankDetailsChange('account_number', e.target.value)}
            placeholder="1234567890"
          />

          <Input
            label="IFSC Code"
            value={formData.bank_details.ifsc_code}
            onChange={(e) => handleBankDetailsChange('ifsc_code', e.target.value.toUpperCase())}
            placeholder="SBIN0001234"
            maxLength={11}
          />

          <Input
            label="Bank Name"
            value={formData.bank_details.bank_name}
            onChange={(e) => handleBankDetailsChange('bank_name', e.target.value)}
            placeholder="State Bank of India"
          />

          <Input
            label="Branch"
            value={formData.bank_details.branch}
            onChange={(e) => handleBankDetailsChange('branch', e.target.value)}
            placeholder="Mumbai Main Branch"
            className="md:col-span-2"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Additional Notes</h3>
        <textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          placeholder="Any additional notes about this vendor..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={loading}
        >
          {vendorId ? 'Update Vendor' : 'Create Vendor'}
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/purchase/vendors')}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </form>
  );
};

export default VendorForm;