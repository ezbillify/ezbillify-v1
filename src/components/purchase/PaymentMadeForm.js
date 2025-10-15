// src/components/purchase/PaymentMadeForm.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import DatePicker from '../shared/calendar/DatePicker';
import Select from '../shared/ui/Select';
import Button from '../shared/ui/Button';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { useAuth } from '../../hooks/useAuth';
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  Users,
  FileText,
  CreditCard,
  Loader2,
  Calculator,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';

const PaymentMadeForm = ({ paymentId, companyId, billId }) => {
  const router = useRouter();
  const { company } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  // ✅ Ref to track if initialization has happened
  const initializationRef = useRef(false);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [paymentNumber, setPaymentNumber] = useState('Loading...');
  const [paymentMode, setPaymentMode] = useState('against_bills');
  const [quickPaymentAmount, setQuickPaymentAmount] = useState('');
  const [formData, setFormData] = useState({
    vendor_id: '',
    payment_date: getTodayDate(),
    payment_method: 'bank_transfer',
    bank_account_id: '',
    reference_number: '',
    notes: '',
    amount: 0
  });

  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedBills, setSelectedBills] = useState([]);

  const [vendorSearch, setVendorSearch] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  // ✅ FIXED: Main initialization useEffect with proper guards
  useEffect(() => {
    let isMounted = true;

    const initializeForm = async () => {
      // ✅ Prevent duplicate initialization (React Strict Mode protection)
      if (initializationRef.current) {
        console.log('⏭️ Skipping duplicate initialization (already ran)');
        return;
      }
      
      console.log('🚀 Starting payment form initialization...');
      initializationRef.current = true;

      try {
        if (!paymentId && isMounted) {
          setPaymentNumber('Loading...');
        }

        if (companyId && isMounted) {
          console.log('📊 Fetching master data...');
          
          await Promise.all([
            fetchVendors(),
            fetchBankAccounts()
          ]);
          
          console.log('✅ Master data loaded');
          
          if (!paymentId && isMounted) {
            console.log('🔢 Fetching payment number preview...');
            await fetchNextPaymentNumber();
          }
        }
        
        if (paymentId && isMounted) {
          console.log('📝 Loading existing payment...');
          await fetchPayment();
        }

        console.log('✅ Payment form initialization complete');
      } catch (error) {
        console.error('❌ Error during payment form initialization:', error);
        if (isMounted && !paymentId) {
          setPaymentNumber('PM-0001/25-26');
        }
      }
    };

    initializeForm();

    return () => {
      isMounted = false;
      console.log('🧹 Payment form cleanup');
    };
  }, [companyId]);

  // ✅ Separate effect for paymentId changes
  useEffect(() => {
    if (paymentId && initializationRef.current) {
      console.log('📝 Payment ID changed, reloading payment data...');
      fetchPayment();
    }
  }, [paymentId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target.closest('.vendor-dropdown') && !target.closest('.vendor-input')) {
        setShowVendorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ FIXED: Fetch next payment number as PREVIEW
  const fetchNextPaymentNumber = async () => {
    console.log('👁️ Fetching payment number PREVIEW (will NOT increment database)...');
    
    try {
      const response = await authenticatedFetch(
        `/api/settings/document-numbering?company_id=${companyId}&document_type=payment_made&action=preview`
        // ✅ CRITICAL: Using action=preview instead of action=next
      );
      
      console.log('📦 Payment Number Preview Response:', response);
      
      if (response && response.success && response.data?.preview) {
        console.log('✅ Setting payment number to:', response.data.preview);
        setPaymentNumber(response.data.preview);
      } else {
        console.log('⚠️ No preview in response, using fallback');
        setPaymentNumber('PM-0001/25-26');
      }
    } catch (error) {
      console.error('❌ Error fetching payment number:', error);
      setPaymentNumber('PM-0001/25-26');
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await authenticatedFetch(
        `/api/vendors?company_id=${companyId}&is_active=true&limit=1000`
      );
      
      if (response && response.success && response.data) {
        setVendors(response.data);
      } else {
        setVendors([]);
      }
    } catch (error) {
      console.error('❌ Error fetching vendors:', error);
      showError('Failed to load vendors');
      setVendors([]);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await authenticatedFetch(
        `/api/master-data/bank-accounts?company_id=${companyId}&is_active=true`
      );
      
      if (response && response.success && response.data) {
        setBankAccounts(response.data);
      } else {
        setBankAccounts([]);
      }
    } catch (error) {
      console.error('❌ Error fetching bank accounts:', error);
      showError('Failed to load bank accounts');
      setBankAccounts([]);
    }
  };

  const fetchVendorBills = async (vendorId) => {
    try {
      const unpaidResponse = await authenticatedFetch(
        `/api/purchase/bills?company_id=${companyId}&vendor_id=${vendorId}&payment_status=unpaid&limit=100&sort_by=due_date&sort_order=asc`
      );
      
      const partialResponse = await authenticatedFetch(
        `/api/purchase/bills?company_id=${companyId}&vendor_id=${vendorId}&payment_status=partially_paid&limit=100&sort_by=due_date&sort_order=asc`
      );
      
      const unpaidBills = (unpaidResponse && unpaidResponse.success && unpaidResponse.data) ? unpaidResponse.data : [];
      const partialBills = (partialResponse && partialResponse.success && partialResponse.data) ? partialResponse.data : [];
      
      const allBills = [...unpaidBills, ...partialBills];
      
      const sortedBills = allBills.sort((a, b) => 
        new Date(a.document_date) - new Date(b.document_date)
      );
      
      setBills(sortedBills);
    } catch (error) {
      console.error('❌ Error fetching bills:', error);
      showError('Failed to load bills');
      setBills([]);
    }
  };

  const fetchPayment = async () => {
    try {
      const response = await authenticatedFetch(
        `/api/purchase/payments-made/${paymentId}?company_id=${companyId}`
      );
      
      if (response && response.success && response.data) {
        const payment = response.data;
        setPaymentNumber(payment.payment_number);
        
        if (payment.bill_payments && payment.bill_payments.length > 0) {
          setPaymentMode('against_bills');
          setFormData({
            vendor_id: payment.vendor_id,
            payment_date: payment.payment_date,
            payment_method: payment.payment_method,
            bank_account_id: payment.bank_account_id || '',
            reference_number: payment.reference_number || '',
            notes: payment.notes || '',
            amount: 0
          });

          if (payment.vendor) {
            setSelectedVendor(payment.vendor);
            setVendorSearch(payment.vendor.vendor_name);
          }

          const bills = payment.bill_payments.map(bp => ({
            bill_id: bp.bill.id,
            bill_number: bp.bill.document_number,
            bill_date: bp.bill.document_date,
            bill_amount: bp.bill.total_amount,
            balance_amount: bp.bill.balance_amount + bp.payment_amount,
            payment_amount: bp.payment_amount
          }));
          
          setSelectedBills(bills);
        } else {
          setPaymentMode('advance');
          setFormData({
            vendor_id: payment.vendor_id,
            payment_date: payment.payment_date,
            payment_method: payment.payment_method,
            bank_account_id: payment.bank_account_id || '',
            reference_number: payment.reference_number || '',
            notes: payment.notes || '',
            amount: payment.amount
          });

          if (payment.vendor) {
            setSelectedVendor(payment.vendor);
            setVendorSearch(payment.vendor.vendor_name);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
      showError('Failed to load payment details');
    }
  };

  const handleVendorSelect = (vendor) => {
    setFormData(prev => ({ ...prev, vendor_id: vendor.id }));
    setSelectedVendor(vendor);
    setVendorSearch(vendor.vendor_name);
    setShowVendorDropdown(false);
    
    if (paymentMode === 'against_bills') {
      fetchVendorBills(vendor.id);
    }
    setSelectedBills([]);
    setQuickPaymentAmount('');
  };

  const handlePaymentModeChange = (mode) => {
    setPaymentMode(mode);
    setSelectedBills([]);
    setQuickPaymentAmount('');
    setFormData(prev => ({ ...prev, amount: 0 }));
    
    if (mode === 'against_bills' && selectedVendor) {
      fetchVendorBills(selectedVendor.id);
    }
  };

  const handleQuickPaymentAllocation = (amount) => {
    setQuickPaymentAmount(amount);
    
    const paymentAmount = parseFloat(amount) || 0;
    if (paymentAmount <= 0 || bills.length === 0) {
      setSelectedBills([]);
      return;
    }

    let remainingAmount = paymentAmount;
    const allocated = [];

    const sortedBills = [...bills].sort((a, b) => 
      new Date(a.document_date) - new Date(b.document_date)
    );

    for (const bill of sortedBills) {
      if (remainingAmount <= 0) break;

      const billBalance = parseFloat(bill.balance_amount);
      const paymentForBill = Math.min(remainingAmount, billBalance);

      if (paymentForBill > 0) {
        allocated.push({
          bill_id: bill.id,
          bill_number: bill.document_number,
          bill_date: bill.document_date,
          bill_amount: bill.total_amount,
          balance_amount: bill.balance_amount,
          payment_amount: paymentForBill
        });

        remainingAmount -= paymentForBill;
      }
    }

    setSelectedBills(allocated);
    
    if (remainingAmount > 0) {
      showSuccess(`Allocated to ${allocated.length} bill(s). ₹${remainingAmount.toFixed(2)} excess will be advance payment.`);
    }
  };

  const handleBillToggle = (bill) => {
    const existing = selectedBills.find(b => b.bill_id === bill.id);
    
    if (existing) {
      setSelectedBills(prev => prev.filter(b => b.bill_id !== bill.id));
    } else {
      setSelectedBills(prev => [...prev, {
        bill_id: bill.id,
        bill_number: bill.document_number,
        bill_date: bill.document_date,
        bill_amount: bill.total_amount,
        balance_amount: bill.balance_amount,
        payment_amount: bill.balance_amount
      }]);
    }
    setQuickPaymentAmount('');
  };

  const handlePaymentAmountChange = (billId, amount) => {
    setSelectedBills(prev =>
      prev.map(bill =>
        bill.bill_id === billId
          ? { ...bill, payment_amount: parseFloat(amount) || 0 }
          : bill
      )
    );
    setQuickPaymentAmount('');
  };

  const handleSelectAll = () => {
    if (selectedBills.length === bills.length) {
      setSelectedBills([]);
    } else {
      setSelectedBills(bills.map(bill => ({
        bill_id: bill.id,
        bill_number: bill.document_number,
        bill_date: bill.document_date,
        bill_amount: bill.total_amount,
        balance_amount: bill.balance_amount,
        payment_amount: bill.balance_amount
      })));
    }
    setQuickPaymentAmount('');
  };

  const calculateTotalPayment = () => {
    if (paymentMode === 'advance') {
      return parseFloat(formData.amount) || 0;
    }
    return selectedBills.reduce((sum, bill) => sum + (parseFloat(bill.payment_amount) || 0), 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const validateForm = () => {
    if (!formData.vendor_id) {
      showError('Please select a vendor');
      return false;
    }

    const totalPayment = calculateTotalPayment();
    if (totalPayment <= 0) {
      showError('Payment amount must be greater than 0');
      return false;
    }

    if (paymentMode === 'against_bills') {
      if (selectedBills.length === 0) {
        showError('Please select at least one bill to pay');
        return false;
      }

      const invalidBills = selectedBills.filter(bill => 
        bill.payment_amount > bill.balance_amount
      );
      if (invalidBills.length > 0) {
        showError('Payment amount cannot exceed bill balance');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const url = paymentId 
        ? `/api/purchase/payments-made/${paymentId}` 
        : '/api/purchase/payments-made';
      const method = paymentId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        company_id: companyId,
        amount: calculateTotalPayment()
      };

      if (paymentMode === 'against_bills') {
        payload.bill_payments = selectedBills;
      }

      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (response && response.success) {
        showSuccess(`Payment ${paymentId ? 'updated' : 'recorded'} successfully!`);
        setTimeout(() => {
          router.push('/purchase/payments-made');
        }, 1500);
      } else {
        showError(response.error || 'Failed to save payment');
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      showError('Failed to save payment');
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.vendor_code.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const totalPayment = calculateTotalPayment();

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' }
  ];

  const bankAccountOptions = bankAccounts.length === 0 
    ? [{ value: '', label: 'No bank accounts found' }]
    : [
        { value: '', label: 'Select Bank Account' },
        ...bankAccounts.map(acc => ({
          value: acc.id,
          label: `${acc.bank_name} - ${acc.account_number}`
        }))
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/purchase/payments-made')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Payment Number: <span className="text-blue-600">#{paymentNumber}</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSubmit}
              disabled={loading || !formData.vendor_id || (paymentMode === 'against_bills' && selectedBills.length === 0) || (paymentMode === 'advance' && !formData.amount)}
              variant="primary"
              icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              Save Payment
            </Button>
            
            <Button
              variant="success"
              icon={<Printer className="w-4 h-4" />}
            >
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Payment Mode Toggle */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">Payment Type:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePaymentModeChange('against_bills')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  paymentMode === 'against_bills'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Against Bills
                </div>
              </button>
              <button
                onClick={() => handlePaymentModeChange('advance')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  paymentMode === 'advance'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Advance Payment
                </div>
              </button>
            </div>
          </div>
          
          {paymentMode === 'advance' && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Advance Payment:</strong> This payment will be recorded as an advance to the vendor and can be adjusted against future bills.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Payment Allocation */}
        {paymentMode === 'against_bills' && selectedVendor && bills.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 shadow-sm p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-purple-900 mb-1">Quick Payment Allocation</h3>
                <p className="text-xs text-purple-700 mb-3">
                  Enter amount to automatically allocate to oldest bills first (FIFO)
                </p>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">₹</span>
                    <input
                      type="number"
                      value={quickPaymentAmount}
                      onChange={(e) => handleQuickPaymentAllocation(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-bold text-lg"
                      placeholder="Enter payment amount"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  {quickPaymentAmount && (
                    <button
                      onClick={() => {
                        setQuickPaymentAmount('');
                        setSelectedBills([]);
                      }}
                      className="px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Row - 3 Columns */}
        <div className="grid grid-cols-3 gap-4">
          
          {/* Vendor Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Vendor</h3>
              </div>
              
              <div className="relative vendor-input mb-3 flex-shrink-0">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Search Vendor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={vendorSearch}
                  onChange={(e) => {
                    setVendorSearch(e.target.value);
                    setShowVendorDropdown(true);
                  }}
                  onFocus={() => setShowVendorDropdown(true)}
                  disabled={paymentId}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100"
                />
                {showVendorDropdown && !paymentId && filteredVendors.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-auto shadow-xl vendor-dropdown">
                    {filteredVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        onClick={() => handleVendorSelect(vendor)}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-sm text-gray-900">{vendor.vendor_name}</div>
                        <div className="text-xs text-gray-500">{vendor.vendor_code}</div>
                        {vendor.current_balance > 0 && (
                          <div className="text-xs text-red-600 font-semibold mt-0.5">
                            Outstanding: {formatCurrency(vendor.current_balance)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedVendor && (
                <div className="space-y-2 flex-shrink-0 overflow-y-auto max-h-48">
                  <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-900 mb-0.5">{selectedVendor.vendor_name}</div>
                    <div className="text-gray-500">{selectedVendor.vendor_code}</div>
                    {selectedVendor.current_balance > 0 && (
                      <div className="text-red-600 font-bold mt-1">
                        Outstanding: {formatCurrency(selectedVendor.current_balance)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <CreditCard className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Payment Details</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={formData.payment_date}
                    onChange={(date) => setFormData(prev => ({ ...prev, payment_date: date }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.payment_method}
                    onChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                    options={paymentMethods}
                  />
                </div>

                {formData.payment_method !== 'cash' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Bank Account
                    </label>
                    <Select
                      value={formData.bank_account_id}
                      onChange={(value) => setFormData(prev => ({ ...prev, bank_account_id: value }))}
                      options={bankAccountOptions}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Cheque/Transaction number"
                  />
                </div>

                {paymentMode === 'advance' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Payment Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Summary Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Payment Summary</h3>
              </div>
              
              <div className="space-y-1.5 text-sm">
                {paymentMode === 'against_bills' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Bills Selected</span>
                      <span className="font-medium">{selectedBills.length}</span>
                    </div>
                    
                    <div className="flex justify-between pt-1.5 border-t border-gray-600">
                      <span className="text-gray-300">Total Balance</span>
                      <span className="font-medium">
                        {formatCurrency(selectedBills.reduce((sum, b) => sum + b.balance_amount, 0))}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Advance Payment</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3">
              <div className="flex justify-between text-lg font-bold pt-1.5 border-t-2 border-gray-200">
                <span className="text-gray-900">PAYMENT AMOUNT</span>
                <span className="text-blue-600">{formatCurrency(totalPayment)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bills Section */}
        {paymentMode === 'against_bills' && selectedVendor && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Unpaid Bills ({bills.length})
                  </h3>
                </div>
                
                {bills.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedBills.length === bills.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
            </div>

            {bills.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <div className="text-base text-gray-500 font-medium mb-1">No unpaid bills</div>
                <div className="text-sm text-gray-400">This vendor has no outstanding bills to pay</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-12">
                        <input
                          type="checkbox"
                          checked={selectedBills.length === bills.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase">Bill Number</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase">Bill Date</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase">Bill Amount</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase">Balance Due</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase">Payment Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bills.map((bill) => {
                      const selected = selectedBills.find(b => b.bill_id === bill.id);
                      return (
                        <tr key={bill.id} className={`hover:bg-gray-50 transition-colors ${selected ? 'bg-blue-50' : ''}`}>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={() => handleBillToggle(bill)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm font-semibold text-gray-900">{bill.document_number}</div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600">
                            {formatDate(bill.document_date)}
                          </td>
                          <td className="px-3 py-3 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(bill.total_amount)}
                          </td>
                          <td className="px-3 py-3 text-sm text-right font-bold text-red-600">
                            {formatCurrency(bill.balance_amount)}
                          </td>
                          <td className="px-3 py-3">
                            {selected ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-gray-500 text-sm">₹</span>
                                <input
                                  type="number"
                                  value={selected.payment_amount}
                                  onChange={(e) => handlePaymentAmountChange(bill.id, e.target.value)}
                                  className="w-32 px-3 py-1.5 text-sm text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
                                  min="0"
                                  max={bill.balance_amount}
                                  step="0.01"
                                />
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 text-right">-</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedBills.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-sm text-gray-600">Bills Selected</p>
                      <p className="text-2xl font-bold text-gray-900">{selectedBills.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Balance</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(selectedBills.reduce((sum, b) => sum + b.balance_amount, 0))}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Payment Amount</p>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalPayment)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Additional Notes</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows="3"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Enter any additional notes or remarks..."
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentMadeForm;