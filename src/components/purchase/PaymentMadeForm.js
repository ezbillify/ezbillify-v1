// src/components/purchase/PaymentMadeForm.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Input from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';

const PaymentMadeForm = ({ paymentId, companyId, billId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [paymentNumber, setPaymentNumber] = useState('Loading...');
  const [formData, setFormData] = useState({
    vendor_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    bank_account_id: '',
    reference_number: '',
    amount: 0,
    notes: ''
  });

  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedBills, setSelectedBills] = useState([]);

  // Search states
  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  useEffect(() => {
    if (!paymentId) {
      setPaymentNumber('Loading...');
    }

    if (companyId) {
      fetchVendors();
      fetchBankAccounts();
      
      if (!paymentId) {
        fetchNextPaymentNumber();
      }
    }
    
    if (paymentId) {
      fetchPayment();
    } else if (billId) {
      loadBill();
    }

    return () => {
      if (!paymentId) {
        setPaymentNumber('Loading...');
      }
    };
  }, [paymentId, companyId, billId, router.asPath]);

  const fetchNextPaymentNumber = async () => {
    console.log('🔍 Fetching next payment number...');
    
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/settings/document-numbering?company_id=${companyId}&document_type=payment_made&action=next`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data?.next_number) {
      setPaymentNumber(result.data.next_number);
      console.log('✅ Fetched payment number:', result.data.next_number);
    } else {
      setPaymentNumber('PM-0001');
      console.warn('⚠️ Failed to fetch payment number, using default');
    }
  };

  const loadBill = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/bills/${billId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const bill = result.data;
      setFormData(prev => ({
        ...prev,
        vendor_id: bill.vendor_id,
        amount: bill.balance_amount || 0
      }));

      if (bill.vendor) {
        setSelectedVendor(bill.vendor);
        setVendorSearch(bill.vendor.vendor_name);
        fetchVendorBills(bill.vendor_id);
      }

      setSelectedBills([{
        bill_id: bill.id,
        bill_number: bill.document_number,
        bill_amount: bill.total_amount,
        balance_amount: bill.balance_amount,
        payment_amount: bill.balance_amount
      }]);
    }
  };

  const fetchVendors = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/vendors?company_id=${companyId}&is_active=true&limit=1000`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setVendors(result.data || []);
    }
  };

  const fetchBankAccounts = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/master-data/bank-accounts?company_id=${companyId}&is_active=true`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setBankAccounts(result.data || []);
    }
  };

  const fetchVendorBills = async (vendorId) => {
    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/purchase/bills?company_id=${companyId}&vendor_id=${vendorId}&payment_status=unpaid,partially_paid&limit=100`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setBills(result.data || []);
    }
  };

  const fetchPayment = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/payments-made/${paymentId}?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const payment = result.data;
      setPaymentNumber(payment.payment_number);
      setFormData({
        vendor_id: payment.vendor_id,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        bank_account_id: payment.bank_account_id || '',
        reference_number: payment.reference_number || '',
        amount: payment.amount,
        notes: payment.notes || ''
      });

      if (payment.vendor) {
        setSelectedVendor(payment.vendor);
        setVendorSearch(payment.vendor.vendor_name);
      }

      setSelectedBills(payment.bill_payments || []);
    }
  };

  const handleVendorSelect = (vendor) => {
    setFormData(prev => ({ ...prev, vendor_id: vendor.id }));
    setSelectedVendor(vendor);
    setVendorSearch(vendor.vendor_name);
    setShowVendorDropdown(false);
    fetchVendorBills(vendor.id);
    setSelectedBills([]);
  };

  const handleBillSelect = (bill) => {
    const existing = selectedBills.find(b => b.bill_id === bill.id);
    
    if (existing) {
      setSelectedBills(prev => prev.filter(b => b.bill_id !== bill.id));
    } else {
      setSelectedBills(prev => [...prev, {
        bill_id: bill.id,
        bill_number: bill.document_number,
        bill_amount: bill.total_amount,
        balance_amount: bill.balance_amount,
        payment_amount: bill.balance_amount
      }]);
    }
  };

  const handlePaymentAmountChange = (billId, amount) => {
    setSelectedBills(prev =>
      prev.map(bill =>
        bill.bill_id === billId
          ? { ...bill, payment_amount: parseFloat(amount) || 0 }
          : bill
      )
    );
  };

  const calculateTotalPayment = () => {
    return selectedBills.reduce((sum, bill) => sum + (parseFloat(bill.payment_amount) || 0), 0);
  };

  const validateForm = () => {
    if (!formData.vendor_id) {
      showError('Please select a vendor');
      return false;
    }

    if (selectedBills.length === 0) {
      showError('Please select at least one bill to pay');
      return false;
    }

    const totalPayment = calculateTotalPayment();
    if (totalPayment <= 0) {
      showError('Payment amount must be greater than 0');
      return false;
    }

    const invalidBills = selectedBills.filter(bill => 
      bill.payment_amount > bill.balance_amount
    );
    if (invalidBills.length > 0) {
      showError('Payment amount cannot exceed bill balance');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const totalAmount = calculateTotalPayment();

    const apiCall = async () => {
      const url = paymentId ? `/api/purchase/payments-made/${paymentId}` : '/api/purchase/payments-made';
      const method = paymentId ? 'PUT' : 'POST';

      return await authenticatedFetch(url, {
        method,
        body: JSON.stringify({
          ...formData,
          company_id: companyId,
          amount: totalAmount,
          bill_payments: selectedBills
        })
      });
    };

    const result = await executeRequest(apiCall);

    if (result.success) {
      success(paymentId ? 'Payment updated successfully' : 'Payment recorded successfully');
      router.push('/purchase/payments-made');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const filteredVendors = vendors.filter(v => 
    v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.vendor_code.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' }
  ];

  const totalPayment = calculateTotalPayment();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {paymentId ? 'Edit Payment Made' : 'Record Payment Made'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Payment Number: <span className="font-semibold text-blue-600">{paymentNumber}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vendor Selection */}
          <div className="lg:col-span-2 relative">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Vendor <span className="text-red-500">*</span>
            </label>
            <Input
              value={vendorSearch}
              onChange={(e) => {
                setVendorSearch(e.target.value);
                setShowVendorDropdown(true);
              }}
              onFocus={() => setShowVendorDropdown(true)}
              placeholder="Search vendor by name or code..."
              required
              disabled={paymentId}
            />
            {showVendorDropdown && !paymentId && filteredVendors.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredVendors.map(vendor => (
                  <div
                    key={vendor.id}
                    onClick={() => handleVendorSelect(vendor)}
                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                  >
                    <div className="font-medium text-slate-900">{vendor.vendor_name}</div>
                    <div className="text-sm text-slate-500">{vendor.vendor_code}</div>
                    {vendor.current_balance > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        Outstanding: {formatCurrency(vendor.current_balance)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <DatePicker
              label="Payment Date"
              value={formData.payment_date}
              onChange={(date) => setFormData(prev => ({ ...prev, payment_date: date }))}
              required
            />
          </div>

          <div>
            <Select
              label="Payment Method"
              value={formData.payment_method}
              onChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
              options={paymentMethods}
              required
            />
          </div>

          {formData.payment_method !== 'cash' && (
            <div className="lg:col-span-2">
              <Select
                label="Bank Account"
                value={formData.bank_account_id}
                onChange={(value) => setFormData(prev => ({ ...prev, bank_account_id: value }))}
                options={[
                  { value: '', label: 'Select Bank Account' },
                  ...bankAccounts.map(acc => ({
                    value: acc.id,
                    label: `${acc.account_name} - ${acc.account_number}`
                  }))
                ]}
              />
            </div>
          )}

          <div className={formData.payment_method === 'cash' ? 'lg:col-span-2' : ''}>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reference Number</label>
            <Input
              value={formData.reference_number}
              onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
              placeholder="Transaction/Cheque/Reference number"
            />
          </div>
        </div>
      </div>

      {/* Vendor Outstanding Summary */}
      {selectedVendor && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-slate-700">Total Outstanding</h4>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(selectedVendor.current_balance || 0)}
              </p>
            </div>
            <div className="text-right">
              <h4 className="text-sm font-medium text-slate-700">Unpaid Bills</h4>
              <p className="text-2xl font-bold text-slate-900 mt-1">{bills.length}</p>
            </div>
            <div className="text-right">
              <h4 className="text-sm font-medium text-slate-700">Payment Amount</h4>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalPayment)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bills to Pay */}
      {selectedVendor && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Select Bills to Pay (Payables)</h3>
          
          {bills.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600">No unpaid bills found for this vendor</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-12"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Bill Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Bill Date</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Bill Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Payment Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {bills.map((bill) => {
                    const selected = selectedBills.find(b => b.bill_id === bill.id);
                    return (
                      <tr key={bill.id} className={selected ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => handleBillSelect(bill)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {bill.document_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(bill.document_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-900">
                          {formatCurrency(bill.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                          {formatCurrency(bill.balance_amount)}
                        </td>
                        <td className="px-4 py-3">
                          {selected ? (
                            <input
                              type="number"
                              value={selected.payment_amount}
                              onChange={(e) => handlePaymentAmountChange(bill.id, e.target.value)}
                              className="w-full px-2 py-1 text-sm text-right border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                              min="0"
                              max={bill.balance_amount}
                              step="0.01"
                            />
                          ) : (
                            <div className="text-sm text-slate-400 text-right">-</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Total */}
          {selectedBills.length > 0 && (
            <div className="mt-6 flex justify-end">
              <div className="w-96 bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Payment:</span>
                  <span className="text-blue-600">{formatCurrency(totalPayment)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Additional Information</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows="4"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Payment notes..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/purchase/payments-made')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading || selectedBills.length === 0}
          icon={loading ? null : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        >
          {loading ? 'Saving...' : paymentId ? 'Update Payment' : 'Record Payment'}
        </Button>
      </div>
    </form>
  );
};

export default PaymentMadeForm;