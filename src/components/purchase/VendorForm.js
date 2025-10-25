// src/components/purchase/VendorForm.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input, { EmailInput, PhoneInput, GSTInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../context/AuthContext';
import { INDIAN_STATES_LIST, getGSTType } from '../../lib/constants';

// Helper function to clean form data - converts empty strings to null
const cleanFormData = (data) => {
  const cleaned = { ...data };
  
  const nullableFields = [
    'display_name', 'email', 'phone', 'mobile', 'website',
    'contact_person', 'designation', 'gstin', 'pan', 'tan',
    'vendor_category', 'notes', 'credit_limit', 'opening_balance', 'alternate_phone'
  ];
  
  nullableFields.forEach(field => {
    if (cleaned[field] === '' || cleaned[field] === undefined) {
      cleaned[field] = null;
    }
  });
  
  if (cleaned.bank_details) {
    Object.keys(cleaned.bank_details).forEach(key => {
      if (cleaned.bank_details[key] === '') {
        cleaned.bank_details[key] = null;
      }
    });
    
    const allNull = Object.values(cleaned.bank_details).every(val => val === null);
    if (allNull) {
      cleaned.bank_details = null;
    }
  }
  
  if (cleaned.credit_limit !== null) {
    cleaned.credit_limit = parseFloat(cleaned.credit_limit) || 0;
  }
  
  if (cleaned.opening_balance !== null) {
    cleaned.opening_balance = parseFloat(cleaned.opening_balance) || 0;
  }
  
  return cleaned;
};

const VendorForm = ({ vendorId, companyId, onComplete }) => {
  const router = useRouter();
  const { company } = useAuth();
  const { success, error: showError } = useToast();
  const { loading, error, executeRequest, authenticatedFetch } = useAPI();

  const [formData, setFormData] = useState({
    vendor_name: '',
    display_name: '',
    email: '',
    phone: '',
    mobile: '',
    alternate_phone: '',
    website: '',
    contact_person: '',
    designation: '',
    gstin: '',
    pan: '',
    tan: '',
    business_type: 'proprietorship',
    vendor_type: 'b2b',
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
    same_as_billing: false,
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
    opening_balance_type: 'payable',
    vendor_category: '',
    notes: '',
    // status removed as per requirement to simplify workflow
    is_active: true,
    gst_type: null
  });

  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [paymentTermsList, setPaymentTermsList] = useState([]);
  const [panAutoFilled, setPanAutoFilled] = useState(false);
  const [fetchingPincode, setFetchingPincode] = useState({
    billing: false,
    shipping: false
  });

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
        shipping_address: { ...prev.billing_address },
        same_as_billing: true
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        same_as_billing: false
      }));
    }
  }, [sameAsBilling]);

  // Calculate GST Type whenever billing state changes
  useEffect(() => {
    if (formData.billing_address.state && company?.address?.state) {
      const gstType = getGSTType(company.address.state, formData.billing_address.state)
      setFormData(prev => ({ ...prev, gst_type: gstType }))
    }
  }, [formData.billing_address.state, company?.address?.state])

  const fetchPaymentTerms = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/master-data/payment-terms?company_id=${companyId}&is_active=true`);
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data) {
      setPaymentTermsList(result.data);
    }
  };

  const fetchVendor = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/vendors/${vendorId}?company_id=${companyId}`);
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
      setSameAsBilling(vendor.same_as_billing || false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleAddressChange = (type, field, value, shouldAutoCopy = true) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));

    // Auto-copy to shipping if same_as_billing is checked
    if (shouldAutoCopy && type === 'billing_address' && sameAsBilling) {
      setFormData(prev => ({
        ...prev,
        shipping_address: {
          ...prev.billing_address,
          [field]: value
        }
      }))
    }
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

  const handleGSTINChange = (value) => {
    const gstin = value.toUpperCase().trim();
    handleChange('gstin', gstin);
    
    if (gstin.length === 15 && !panAutoFilled) {
      const extractedPAN = gstin.substring(2, 12);
      const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (panPattern.test(extractedPAN)) {
        handleChange('pan', extractedPAN);
        setPanAutoFilled(true);
        success('PAN auto-filled from GSTIN');
      }
    }
    
    if (gstin.length < 15) {
      setPanAutoFilled(false);
    }
  };

  const fetchPincodeDetails = async (pincode, addressType) => {
    if (pincode.length !== 6) return;
    
    const type = addressType === 'billing_address' ? 'billing' : 'shipping';
    setFetchingPincode(prev => ({ ...prev, [type]: true }));

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      
      if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0];
        handleAddressChange(addressType, 'state', postOffice.State, false);
        handleAddressChange(addressType, 'city', postOffice.District, false);
        success('Location details fetched from pincode');
      }
    } catch (error) {
      console.error('Error fetching pincode details:', error);
    } finally {
      setFetchingPincode(prev => ({ ...prev, [type]: false }));
    }
  };

  const fetchIFSCDetails = async (ifsc) => {
    if (ifsc.length === 11) {
      try {
        const response = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
        if (response.ok) {
          const data = await response.json();
          handleBankDetailsChange('bank_name', data.BANK);
          handleBankDetailsChange('branch', data.BRANCH);
          success('Bank details fetched successfully');
        } else {
          showError('Invalid IFSC code or bank details not found');
        }
      } catch (error) {
        console.error('Error fetching IFSC details:', error);
        showError('Failed to fetch bank details');
      }
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.vendor_name.trim()) {
      errors.vendor_name = 'Vendor name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.gstin && formData.gstin.trim() && formData.gstin.length !== 15) {
      errors.gstin = 'GSTIN must be 15 characters';
    }

    if (formData.pan && formData.pan.trim() && formData.pan.length !== 10) {
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

      const cleanedData = cleanFormData({
        ...formData,
        company_id: companyId
      });

      return await authenticatedFetch(url, {
        method,
        body: JSON.stringify(cleanedData)
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

  const vendorTypeOptions = [
    { value: 'b2b', label: 'B2B (Business)' },
    { value: 'b2c', label: 'B2C (Individual)' },
    { value: 'both', label: 'Both' }
  ];

  const taxPreferenceOptions = [
    { value: 'taxable', label: 'Taxable' },
    { value: 'exempt', label: 'Tax Exempt' },
    { value: 'nil_rated', label: 'Nil Rated' },
    { value: 'non_gst', label: 'Non-GST' }
  ];

  const openingBalanceTypeOptions = [
    { value: 'payable', label: 'Payable (We Owe)' },
    { value: 'receivable', label: 'Receivable (They Owe)' }
  ];

  const paymentTermsOptions = paymentTermsList.length > 0 
    ? paymentTermsList.map(term => ({
        value: parseInt(term.term_days) || 0,
        label: `${term.term_name} (${term.term_days} days)`
      }))
    : [
        { value: 0, label: 'Immediate' },
        { value: 7, label: 'Net 7 Days' },
        { value: 15, label: 'Net 15 Days' },
        { value: 30, label: 'Net 30 Days' },
        { value: 45, label: 'Net 45 Days' },
        { value: 60, label: 'Net 60 Days' },
        { value: 90, label: 'Net 90 Days' }
      ];

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

          <PhoneInput
            label="Alternate Phone"
            value={formData.alternate_phone}
            onChange={(e) => handleChange('alternate_phone', e.target.value)}
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

          <Select
            label="Vendor Type"
            value={formData.vendor_type}
            onChange={(value) => handleChange('vendor_type', value)}
            options={vendorTypeOptions}
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
            onChange={(e) => handleGSTINChange(e.target.value)}
            error={validationErrors.gstin}
            placeholder="22AAAAA0000A1Z5"
            helperText="PAN will be auto-filled"
          />

          <Input
            label="PAN"
            value={formData.pan}
            onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
            error={validationErrors.pan}
            maxLength={10}
            placeholder="ABCDE1234F"
            helperText="Auto-filled from GSTIN"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Address Line 1"
            value={formData.billing_address.address_line1}
            onChange={(e) => handleAddressChange('billing_address', 'address_line1', e.target.value)}
            placeholder="Building, Street"
            className="md:col-span-2"
          />
          
          <Input
            label="Address Line 2"
            value={formData.billing_address.address_line2}
            onChange={(e) => handleAddressChange('billing_address', 'address_line2', e.target.value)}
            placeholder="Area, Landmark (optional)"
            className="md:col-span-2"
          />
          
          <Input
            label="Pincode"
            value={formData.billing_address.pincode}
            onChange={(e) => {
              const pincode = e.target.value;
              handleAddressChange('billing_address', 'pincode', pincode);
              fetchPincodeDetails(pincode, 'billing_address');
            }}
            placeholder="000000"
            maxLength={6}
            helperText={fetchingPincode.billing ? 'Fetching location...' : 'Enter 6-digit pincode'}
          />
          
          <Input
            label="City"
            value={formData.billing_address.city}
            onChange={(e) => handleAddressChange('billing_address', 'city', e.target.value)}
            placeholder="City"
          />
          
          <Select
            label="State"
            value={formData.billing_address.state}
            onChange={(value) => handleAddressChange('billing_address', 'state', value)}
            options={INDIAN_STATES_LIST}
            searchable
            placeholder="Select state"
          />
          
          <Input
            label="Country"
            value={formData.billing_address.country}
            onChange={(e) => handleAddressChange('billing_address', 'country', e.target.value)}
            placeholder="Country"
          />
        </div>

        {/* GST Type Indicator */}
        {formData.billing_address.state && company?.address?.state && (
          <div className={`mt-4 p-3 rounded-lg border ${
            formData.gst_type === 'intrastate'
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {formData.gst_type === 'intrastate' ? (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Same State - Intrastate Supply
                    </p>
                    <p className="text-xs text-green-700 mt-0.5">
                      CGST + SGST will apply on purchase bills
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Different State - Interstate Supply
                    </p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      IGST will apply on purchase bills
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Address Line 1"
            value={formData.shipping_address.address_line1}
            onChange={(e) => handleAddressChange('shipping_address', 'address_line1', e.target.value)}
            placeholder="Building, Street"
            className="md:col-span-2"
            disabled={sameAsBilling}
          />
          
          <Input
            label="Address Line 2"
            value={formData.shipping_address.address_line2}
            onChange={(e) => handleAddressChange('shipping_address', 'address_line2', e.target.value)}
            placeholder="Area, Landmark (optional)"
            className="md:col-span-2"
            disabled={sameAsBilling}
          />
          
          <Input
            label="Pincode"
            value={formData.shipping_address.pincode}
            onChange={(e) => {
              const pincode = e.target.value;
              handleAddressChange('shipping_address', 'pincode', pincode);
              if (!sameAsBilling) {
                fetchPincodeDetails(pincode, 'shipping_address');
              }
            }}
            placeholder="000000"
            maxLength={6}
            disabled={sameAsBilling}
            helperText={fetchingPincode.shipping ? 'Fetching location...' : ''}
          />
          
          <Input
            label="City"
            value={formData.shipping_address.city}
            onChange={(e) => handleAddressChange('shipping_address', 'city', e.target.value)}
            placeholder="City"
            disabled={sameAsBilling}
          />
          
          <Select
            label="State"
            value={formData.shipping_address.state}
            onChange={(value) => handleAddressChange('shipping_address', 'state', value)}
            options={INDIAN_STATES_LIST}
            searchable
            placeholder="Select state"
            disabled={sameAsBilling}
          />
          
          <Input
            label="Country"
            value={formData.shipping_address.country}
            onChange={(e) => handleAddressChange('shipping_address', 'country', e.target.value)}
            placeholder="Country"
            disabled={sameAsBilling}
          />
        </div>
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
            className="md:col-span-2"
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
            onChange={(e) => {
              const ifsc = e.target.value.toUpperCase();
              handleBankDetailsChange('ifsc_code', ifsc);
              fetchIFSCDetails(ifsc);
            }}
            placeholder="SBIN0001234"
            maxLength={11}
            helperText="Bank & Branch will be auto-filled"
          />

          <Input
            label="Bank Name"
            value={formData.bank_details.bank_name}
            onChange={(e) => handleBankDetailsChange('bank_name', e.target.value)}
            placeholder="Bank name"
            readOnly
            className="bg-slate-50"
          />

          <Input
            label="Branch"
            value={formData.bank_details.branch}
            onChange={(e) => handleBankDetailsChange('branch', e.target.value)}
            placeholder="Branch name"
            readOnly
            className="bg-slate-50"
          />
        </div>
      </div>

      {/* Additional Notes */}
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