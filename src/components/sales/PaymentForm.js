// src/components/sales/PaymentForm.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import DatePicker from '../shared/calendar/DatePicker';
import Select from '../shared/ui/Select';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { useCustomers } from '../../hooks/useCustomers';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { 
  ArrowLeft, 
  Save, 
  Printer, 
  Send, 
  Calculator, 
  Users,
  FileText,
  Search,
  Trash2,
  Loader2,
  Plus,
  Minus
} from 'lucide-react';

const PaymentForm = ({ paymentId, companyId, invoiceId }) => {
  const router = useRouter();
  const { company } = useAuth();
  const { branches, selectedBranch, selectBranch } = useBranch();
  const { success: showSuccess, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();
  const { fetchCustomers: fetchCustomerData, customers: fetchedCustomers } = useCustomers();

  const initializationRef = useRef(false);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [paymentNumber, setPaymentNumber] = useState('Select Branch...');
  const [formData, setFormData] = useState({
    customer_id: '',
    payment_date: getTodayDate(),
    amount: '',
    payment_method: 'cash',
    bank_account_id: '',
    reference_number: '',
    notes: '',
    status: 'completed'
  });

  const [allocations, setAllocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentBranch, setPaymentBranch] = useState(null);
  const [customerBalance, setCustomerBalance] = useState(0);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');

  useEffect(() => {
    let isMounted = true;

    const initializeForm = async () => {
      if (initializationRef.current) {
        console.log('⏭️ Skipping duplicate initialization');
        return;
      }
      
      console.log('🚀 Starting payment form initialization...');
      initializationRef.current = true;

      try {
        if (!paymentId && isMounted) {
          setPaymentNumber('Select Branch...');
        }

        if (companyId && isMounted) {
          console.log('📊 Fetching master data...');
          
          await Promise.all([
            fetchCustomerData(companyId), // Fetch all active customers
            fetchBankAccounts()
          ]);
          
          console.log('✅ Master data loaded');
        }
        
        if (paymentId && isMounted) {
          console.log('📝 Loading existing payment...');
          await fetchPayment();
        } else if (invoiceId && isMounted) {
          console.log('📦 Loading invoice data...');
          await loadInvoice();
        }

        console.log('✅ Form initialization complete');
      } catch (error) {
        console.error('❌ Error during form initialization:', error);
        if (isMounted && !paymentId) {
          setPaymentNumber('PAY-0001/25-26');
        }
      }
    };

    initializeForm();

    return () => {
      isMounted = false;
      console.log('🧹 Form cleanup');
    };
  }, [companyId]);

  useEffect(() => {
    // Update local customers state when fetchedCustomers changes
    setCustomers(fetchedCustomers);
  }, [fetchedCustomers]);

  useEffect(() => {
    if (paymentId && initializationRef.current) {
      console.log('📝 Payment ID changed, reloading data...');
      fetchPayment();
    }
  }, [paymentId]);

  useEffect(() => {
    if (invoiceId && !paymentId && initializationRef.current) {
      console.log('📦 Invoice ID changed, reloading data...');
      loadInvoice();
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!paymentId && selectedBranch?.id && initializationRef.current && companyId) {
      console.log('🏢 Branch changed, updating payment number preview...');
      setPaymentNumber('Loading...');
      fetchNextPaymentNumber();
    }
  }, [selectedBranch?.id]);

  useEffect(() => {
    if (selectedCustomer && companyId) {
      fetchCustomerInvoices();
      fetchCustomerBalance();
    }
  }, [selectedCustomer, companyId]);

  const fetchNextPaymentNumber = async () => {
    console.log('👁️ Fetching payment number PREVIEW (will NOT increment database)...');
    
    // Build URL with company_id and optional branch_id
    let url = `/api/settings/document-numbering?company_id=${companyId}&document_type=payment_received&action=preview`;
    
    if (selectedBranch?.id) {
      url += `&branch_id=${selectedBranch.id}`;
      console.log('🏢 Using branch for payment number:', selectedBranch.name || selectedBranch.branch_name);
    }
    
    const apiCall = async () => {
      return await authenticatedFetch(url);
    };

    const result = await executeRequest(apiCall);
    console.log('📊 Preview API Result:', result);
    
    if (result.success && result.data?.preview) {
      console.log('✅ Setting payment number to:', result.data.preview);
      setPaymentNumber(result.data.preview);
    } else {
      console.warn('⚠️ No preview data received, using fallback');
      setPaymentNumber('PAY-0001/25-26');
    }
  };

  const fetchCustomers = async () => {
    try {
      const result = await fetchCustomerData(companyId); // Fetch all active customers
      if (result.success) {
        setCustomers(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await authenticatedFetch(`/api/master-data/bank-accounts?company_id=${companyId}`);
      if (response.success) {
        setBankAccounts(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchCustomerInvoices = async () => {
    if (!selectedCustomer?.id) return;
    
    try {
      const response = await authenticatedFetch(
        `/api/sales/invoices?company_id=${companyId}&customer_id=${selectedCustomer.id}&status=confirmed&payment_status=unpaid,paid,partial`
      );
      
      if (response.success) {
        setInvoices(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
    }
  };

  const fetchCustomerBalance = async () => {
    if (!selectedCustomer?.id) return;
    
    try {
      const response = await authenticatedFetch(
        `/api/customers/${selectedCustomer.id}/balance?company_id=${companyId}`
      );
      
      if (response.success) {
        setCustomerBalance(response.data?.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching customer balance:', error);
    }
  };

  const fetchPayment = async () => {
    try {
      const response = await authenticatedFetch(`/api/sales/payments/${paymentId}?company_id=${companyId}`);
      
      if (response.success && response.data) {
        const payment = response.data;
        
        setFormData({
          customer_id: payment.customer_id,
          payment_date: payment.payment_date,
          amount: payment.amount,
          payment_method: payment.payment_method,
          bank_account_id: payment.bank_account_id,
          reference_number: payment.reference_number,
          notes: payment.notes || '',
          status: payment.status
        });

        setPaymentNumber(payment.payment_number);
        
        if (payment.customer) {
          setSelectedCustomer(payment.customer);
          setCustomerSearch(payment.customer.name);
        }

        if (payment.branch) {
          setPaymentBranch(payment.branch);
        }

        if (payment.allocations && payment.allocations.length > 0) {
          const formattedAllocations = payment.allocations.map(allocation => ({
            id: allocation.id,
            document_id: allocation.document?.id,
            document_number: allocation.document?.document_number,
            document_date: allocation.document?.document_date,
            total_amount: allocation.document?.total_amount,
            allocated_amount: allocation.allocated_amount,
            balance_amount: (allocation.document?.total_amount || 0) - (allocation.document?.paid_amount || 0) + (allocation.allocated_amount || 0)
          }));
          setAllocations(formattedAllocations);
        }
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
      showError('Failed to load payment');
    }
  };

  const loadInvoice = async () => {
    try {
      const response = await authenticatedFetch(`/api/sales/invoices/${invoiceId}?company_id=${companyId}`);
      
      if (response.success && response.data) {
        const invoice = response.data;
        
        setFormData(prev => ({
          ...prev,
          customer_id: invoice.customer_id,
          payment_date: getTodayDate(),
          amount: ''
        }));

        if (invoice.customer) {
          setSelectedCustomer(invoice.customer);
          setCustomerSearch(invoice.customer.name);
        }

        const newAllocation = {
          id: Date.now(),
          document_id: invoice.id,
          document_number: invoice.document_number,
          document_date: invoice.document_date,
          total_amount: invoice.total_amount,
          allocated_amount: '',
          balance_amount: (invoice.total_amount || 0) - (invoice.paid_amount || 0)
        };
        
        setAllocations([newAllocation]);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      showError('Failed to load invoice data');
    }
  };

  const filteredCustomers = customers.filter(customer =>
    (customer?.name?.toLowerCase() || '').includes(customerSearch.toLowerCase()) ||
    (customer?.customer_code?.toLowerCase() || '').includes(customerSearch.toLowerCase()) ||
    (customer?.email?.toLowerCase() || '').includes(customerSearch.toLowerCase())
  );

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setShowCustomerDropdown(false);
  };

  const addAllocation = () => {
    const newAllocation = {
      id: Date.now(),
      document_id: '',
      document_number: '',
      document_date: '',
      total_amount: 0,
      allocated_amount: '',
      balance_amount: 0
    };
    setAllocations(prev => [...prev, newAllocation]);
  };

  const removeAllocation = (index) => {
    setAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const handleAllocationChange = (index, field, value) => {
    setAllocations(prev => {
      const newAllocations = [...prev];
      newAllocations[index] = { ...newAllocations[index], [field]: value };
      
      // If document is selected, auto-fill details
      if (field === 'document_id' && value) {
        const invoice = invoices.find(inv => inv.id === value);
        if (invoice) {
          newAllocations[index] = {
            ...newAllocations[index],
            document_id: invoice.id,
            document_number: invoice.document_number,
            document_date: invoice.document_date,
            total_amount: invoice.total_amount,
            balance_amount: (invoice.total_amount || 0) - (invoice.paid_amount || 0)
          };
        }
      }
      
      return newAllocations;
    });
  };

  const calculateTotalAllocated = () => {
    return allocations.reduce((sum, alloc) => sum + (parseFloat(alloc.allocated_amount) || 0), 0);
  };

  const validateForm = async () => {
    if (!formData.customer_id) {
      showError('Please select a customer');
      return false;
    }

    // Validate that the customer_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formData.customer_id)) {
      showError('Invalid customer selected. Please select a valid customer.');
      return false;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError('Please enter a valid payment amount');
      return false;
    }

    const totalAllocated = calculateTotalAllocated();
    if (totalAllocated > parseFloat(formData.amount)) {
      showError('Total allocated amount cannot exceed payment amount');
      return false;
    }

    // Validate allocations
    for (let i = 0; i < allocations.length; i++) {
      const alloc = allocations[i];
      if (!alloc.document_id) {
        showError(`Please select an invoice for allocation #${i + 1}`);
        return false;
      }
      if (!alloc.allocated_amount || parseFloat(alloc.allocated_amount) <= 0) {
        showError(`Please enter a valid amount for allocation #${i + 1}`);
        return false;
      }
      if (parseFloat(alloc.allocated_amount) > alloc.balance_amount) {
        showError(`Allocation amount for ${alloc.document_number} exceeds balance`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm())) return;

    const apiCall = async () => {
      const url = paymentId ? `/api/sales/payments/${paymentId}` : '/api/sales/payments';
      const method = paymentId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        company_id: companyId,
        allocations: allocations.map(alloc => ({
          document_id: alloc.document_id,
          allocated_amount: parseFloat(alloc.allocated_amount)
        }))
      };

      if (!paymentId && selectedBranch?.id) {
        payload.branch_id = selectedBranch.id;
        console.log('🏢 Saving payment with branch:', selectedBranch.name || selectedBranch.branch_name);
      }

      return await authenticatedFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
    };

    const result = await executeRequest(apiCall);

    if (result.success) {
      showSuccess(`Payment ${paymentId ? 'updated' : 'created'} successfully!`);
      setTimeout(() => {
        router.push('/sales/payments');
      }, 1500);
    }
  };

  const totalAllocated = calculateTotalAllocated();
  const unallocatedAmount = parseFloat(formData.amount || 0) - totalAllocated;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <style jsx>{`
        .branch-selector-compact :global(button) {
          padding: 0.5rem 0.75rem !important;
          font-size: 0.875rem !important;
          min-height: auto !important;
        }
        .branch-selector-compact :global(.absolute.inset-0) {
          display: none !important;
        }
      `}</style>
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {paymentId ? 'Edit Payment' : 'Receive Payment'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div>
                    <h1 className="text-sm font-semibold text-gray-900">
                      Payment Number: <span className={paymentNumber === 'Select Branch...' || paymentNumber === 'Loading...' ? 'text-gray-400' : 'text-blue-600'}>#{paymentNumber}</span>
                    </h1>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {paymentId && paymentBranch ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-sm font-medium text-blue-900">
                          Branch: {paymentBranch.name || paymentBranch.branch_name}
                        </span>
                      </div>
                    ) : !paymentId && selectedBranch ? (
                      <div style={{ width: '200px' }}>
                        <Select
                          value={selectedBranch.id}
                          onChange={(value) => selectBranch(value)}
                          options={branches.map(b => ({ value: b.id, label: b.name || b.branch_name }))}
                          placeholder="Select Branch..."
                          className="branch-selector-compact"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              <button 
                onClick={handleSubmit}
                disabled={loading || !formData.customer_id || !formData.amount}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save (Ctrl+S)
              </button>
              
              <button className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
                <Printer className="w-4 h-4" />
                Print
              </button>
              
              <button className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors">
                <Send className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Top Row - Customer, Payment Details, Summary */}
        <div className="grid grid-cols-3 gap-4">
          
          {/* Customer Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Customer</h3>
              </div>
              
              <div className="relative customer-input mb-3 flex-shrink-0">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Search Customer <span className="text-gray-400 text-xs">(F1)</span>
                </label>
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-48 overflow-auto shadow-xl">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-sm text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.customer_code}</div>
                        {customer.gstin && (
                          <div className="text-xs text-blue-600 font-mono mt-0.5">GSTIN: {customer.gstin}</div>
                        )}
                        {customer.billing_address?.address_line1 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {customer.billing_address.address_line1}
                            {customer.billing_address.city && `, ${customer.billing_address.city}`}
                            {customer.billing_address.state && `, ${customer.billing_address.state}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedCustomer && selectedCustomer.billing_address && (
                <div className="space-y-2 flex-shrink-0 overflow-y-auto max-h-48">
                  <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-900 mb-0.5">{selectedCustomer.name}</div>
                    <div>{selectedCustomer.billing_address.address_line1}</div>
                    {selectedCustomer.billing_address.city && (
                      <div>
                        {selectedCustomer.billing_address.city}
                        {selectedCustomer.billing_address.state && `, ${selectedCustomer.billing_address.state}`}
                        {selectedCustomer.billing_address.pincode && ` - ${selectedCustomer.billing_address.pincode}`}
                      </div>
                    )}
                  </div>
                  
                  {selectedCustomer.gstin && (
                    <div className="text-xs text-blue-700 bg-blue-50 p-2.5 rounded-lg font-mono border border-blue-200">
                      <span className="font-semibold">GSTIN:</span> {selectedCustomer.gstin}
                    </div>
                  )}

                  <div className="text-xs p-2.5 rounded-lg border bg-purple-50 border-purple-200">
                    <div className="font-semibold text-purple-800 mb-0.5">Customer Balance</div>
                    <div className={`text-sm font-semibold ${customerBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Math.abs(customerBalance).toFixed(2)} {customerBalance >= 0 ? 'Credit' : 'Debit'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Payment Details</h3>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={formData.payment_date}
                      onChange={(date) => setFormData(prev => ({ ...prev, payment_date: date }))}
                      required
                      className="custom-datepicker"
                    />
                  </div>
                  
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Payment Method
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="upi">UPI</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                    </select>
                  </div>
                  
                  {formData.payment_method !== 'cash' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Bank Account
                      </label>
                      <Select
                        value={formData.bank_account_id}
                        onChange={(value) => setFormData(prev => ({ ...prev, bank_account_id: value }))}
                        options={bankAccounts.map(account => ({
                          value: account.id,
                          label: `${account.account_name} (${account.account_number})`
                        }))}
                        placeholder="Select bank account"
                      />
                    </div>
                  )}
                </div>

                {formData.payment_method !== 'cash' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={formData.reference_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Cheque number, UPI ID, etc."
                    />
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
                <div className="flex justify-between">
                  <span className="text-gray-300">Payment Amount</span>
                  <span className="font-medium">₹{parseFloat(formData.amount || 0).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-300">Allocated Amount</span>
                  <span className="font-medium text-green-400">₹{totalAllocated.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between pt-1.5 border-t border-gray-600">
                  <span className="text-gray-300">Unallocated Amount</span>
                  <span className={`font-medium ${unallocatedAmount >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    ₹{unallocatedAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes for this payment..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Allocations Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Invoice Allocations</h3>
              <Button
                variant="outline"
                onClick={addAllocation}
                icon={<Plus className="w-4 h-4" />}
                size="sm"
              >
                Add Allocation
              </Button>
            </div>

            {/* Allocations Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Allocate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {allocations.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                          <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                          <p>No allocations added yet</p>
                          <p className="text-sm mt-1">Add invoice allocations for this payment</p>
                          <Button
                            variant="outline"
                            onClick={addAllocation}
                            icon={<Plus className="w-4 h-4" />}
                            className="mt-2"
                            size="sm"
                          >
                            Add Allocation
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      allocations.map((allocation, index) => (
                        <tr key={allocation.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                          <td className="px-4 py-3">
                            {allocation.document_id ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900">{allocation.document_number}</div>
                              </div>
                            ) : (
                              <Select
                                value={allocation.document_id}
                                onChange={(value) => handleAllocationChange(index, 'document_id', value)}
                                options={invoices.map(invoice => ({
                                  value: invoice.id,
                                  label: `${invoice.document_number} (₹${(invoice.total_amount || 0).toFixed(2)})`
                                }))}
                                placeholder="Select invoice"
                                className="w-48"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {allocation.document_date ? new Date(allocation.document_date).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            ₹{(allocation.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            ₹{(allocation.balance_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={allocation.allocated_amount}
                              onChange={(e) => handleAllocationChange(index, 'allocated_amount', e.target.value)}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeAllocation(index)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {allocations.length > 0 && (
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="5" className="px-4 py-2 text-sm font-medium text-gray-900 text-right">Total Allocated</td>
                        <td className="px-4 py-2 text-sm font-medium text-green-600">₹{totalAllocated.toFixed(2)}</td>
                        <td className="px-4 py-2"></td>
                      </tr>
                      <tr>
                        <td colSpan="5" className="px-4 py-2 text-sm font-medium text-gray-900 text-right">Unallocated Amount</td>
                        <td className={`px-4 py-2 text-sm font-medium ${unallocatedAmount >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          ₹{unallocatedAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {unallocatedAmount < 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Total allocated amount exceeds payment amount by ₹{Math.abs(unallocatedAmount).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
