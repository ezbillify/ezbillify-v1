// src/components/sales/PaymentForm.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import DatePicker from '../shared/calendar/DatePicker';
import Select from '../shared/ui/Select';
import Button from '../shared/ui/Button';
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
  Minus,
  AlertCircle,
  Wand2
} from 'lucide-react';

const PaymentForm = ({ paymentId, companyId, invoiceId, readOnly = false }) => {
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
    notes: ''
    // status removed as per requirement to simplify workflow
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
    console.log('Customer or company ID changed:', { selectedCustomer, companyId });
    if (selectedCustomer?.id && companyId) {
      console.log('Fetching customer invoices and balance');
      // Add a small delay to ensure all state updates are complete
      const timer = setTimeout(() => {
        fetchCustomerInvoices();
        fetchCustomerBalance();
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [selectedCustomer?.id, companyId, selectedCustomer]);

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
    if (!selectedCustomer?.id) {
      console.log('No customer ID, skipping invoice fetch');
      return;
    }

    if (!companyId) {
      console.log('No company ID, skipping invoice fetch');
      return;
    }

    try {
      console.log('Fetching invoices for customer:', selectedCustomer.id, 'company:', companyId);
      // Request all unpaid and partial paid invoices for the customer
      // Note: We need to filter by payment_status=unpaid OR payment_status=partial
      const response = await authenticatedFetch(
        `/api/sales/invoices?company_id=${companyId}&customer_id=${selectedCustomer.id}`
      );

      console.log('Invoice response:', response);
      if (response.success) {
        // Filter for unpaid and partial invoices, and add calculated fields
        const invoicesWithDetails = (response.data || [])
          .filter(invoice =>
            invoice.payment_status === 'unpaid' ||
            invoice.payment_status === 'partial'
          )
          .map(invoice => ({
            ...invoice,
            balance_amount: (invoice.total_amount || 0) - (invoice.paid_amount || 0)
          }));
        setInvoices(invoicesWithDetails);
        console.log('Fetched invoices:', invoicesWithDetails);
        console.log('Number of invoices fetched:', invoicesWithDetails.length);
        
        // If we have invoices, update any existing allocations that might need updating
        if (invoicesWithDetails.length > 0 && allocations.length > 0) {
          setAllocations(prev => prev.map(alloc => {
            if (!alloc.document_id) return alloc;
            const invoice = invoicesWithDetails.find(inv => inv.id === alloc.document_id);
            if (invoice) {
              return {
                ...alloc,
                document_number: invoice.document_number,
                document_date: invoice.document_date,
                total_amount: invoice.total_amount,
                balance_amount: (invoice.total_amount || 0) - (invoice.paid_amount || 0)
              };
            }
            return alloc;
          }));
        }
        
        // Make sure we're showing the invoices in the UI
        setInvoices(invoicesWithDetails);
        
        // If no invoices found, make sure we clear the list
        if (invoicesWithDetails.length === 0) {
          setInvoices([]);
        }
      } else {
        console.error('Failed to fetch invoices:', response.error);
        showError('Failed to load customer invoices: ' + response.error);
        // Clear invoices on error
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      showError('Failed to load customer invoices');
      // Clear invoices on error
      setInvoices([]);
    }
  };

  // Alternative function to calculate balance from invoices
  const fetchCustomerInvoicesForBalance = async () => {
    if (!selectedCustomer?.id || !companyId) {
      return;
    }
    
    try {
      // Fetch all invoices for this customer to calculate balance
      const response = await authenticatedFetch(
        `/api/sales/invoices?company_id=${companyId}&customer_id=${selectedCustomer.id}`
      );
      
      if (response.success && response.data) {
        const invoices = response.data || [];
        let totalSales = 0;
        let totalPaid = 0;
        
        invoices.forEach(invoice => {
          totalSales += parseFloat(invoice.total_amount) || 0;
          totalPaid += parseFloat(invoice.paid_amount) || 0;
        });
        
        // Calculate balance: Total Sales - Total Paid
        const balance = totalSales - totalPaid;
        setCustomerBalance(balance);
        console.log('Calculated customer balance from invoices:', balance);
        return balance;
      }
      return 0;
    } catch (error) {
      console.error('Error calculating balance from invoices:', error);
      return 0;
    }
  };

  const fetchCustomerBalance = async () => {
    if (!selectedCustomer?.id) {
      console.log('No customer ID, skipping balance fetch');
      return;
    }
    
    if (!companyId) {
      console.log('No company ID, skipping balance fetch');
      return;
    }
    
    try {
      console.log('Fetching customer balance for:', selectedCustomer.id, 'company:', companyId);
      const response = await authenticatedFetch(
        `/api/customers/${selectedCustomer.id}?company_id=${companyId}&balance=true`
      );
      
      console.log('Customer balance response:', response);
      if (response.success) {
        const balance = response.data?.balance || 0;
        setCustomerBalance(balance);
        console.log('Fetched customer balance:', balance);
      } else {
        console.error('Failed to fetch customer balance:', response.error);
        // Try alternative approach - fetch invoices and calculate from them
        console.log('Trying alternative balance calculation from invoices');
        const altBalance = await fetchCustomerInvoicesForBalance();
        setCustomerBalance(altBalance);
        showError('Failed to load customer balance: ' + response.error);
      }
    } catch (error) {
      console.error('Error fetching customer balance:', error);
      // Try alternative approach - fetch invoices and calculate from them
      console.log('Trying alternative balance calculation from invoices');
      const altBalance = await fetchCustomerInvoicesForBalance();
      setCustomerBalance(altBalance);
      showError('Failed to load customer balance');
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
            document_id: allocation.document_id || allocation.document?.id,
            document_number: allocation.document?.document_number || allocation.document_number,
            document_date: allocation.document?.document_date || allocation.document_date,
            total_amount: allocation.document?.total_amount || allocation.total_amount,
            allocated_amount: allocation.allocated_amount,
            balance_amount: (allocation.document?.total_amount || allocation.total_amount || 0) - (allocation.document?.paid_amount || 0) + (allocation.allocated_amount || 0)
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
        
        // Ensure customer invoices and balance are fetched after setting customer
        if (invoice.customer?.id && companyId) {
          setTimeout(() => {
            console.log('Executing fetchCustomerInvoices and fetchCustomerBalance from loadInvoice');
            fetchCustomerInvoices();
            fetchCustomerBalance();
          }, 150);
        }
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
    console.log('Customer selected:', customer);
    console.log('Customer ID:', customer.id);
    console.log('Company ID:', companyId);
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setShowCustomerDropdown(false);
    
    // Force fetch customer data after selection
    if (customer.id && companyId) {
      console.log('Manually fetching customer invoices and balance');
      // Use a small delay to ensure state is updated before fetching
      setTimeout(() => {
        console.log('Executing fetchCustomerInvoices and fetchCustomerBalance');
        fetchCustomerInvoices();
        fetchCustomerBalance();
      }, 150);
    }
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
            balance_amount: invoice.balance_amount || ((invoice.total_amount || 0) - (invoice.paid_amount || 0))
          };
        }
      }
      
      return newAllocations;
    });
  };

  // New function to auto-allocate payments to oldest invoices first
  const autoAllocatePayments = () => {
    const paymentAmount = parseFloat(formData.amount) || 0;
    if (paymentAmount <= 0 || invoices.length === 0) return;

    // Sort invoices by date (oldest first)
    const sortedInvoices = [...invoices].sort((a, b) => 
      new Date(a.document_date) - new Date(b.document_date)
    );

    let remainingAmount = paymentAmount;
    const newAllocations = [];

    // Allocate to invoices in order until payment is fully allocated
    for (const invoice of sortedInvoices) {
      if (remainingAmount <= 0) break;

      const balance = invoice.balance_amount || 0;
      if (balance <= 0) continue;

      const allocatedAmount = Math.min(remainingAmount, balance);
      
      newAllocations.push({
        id: Date.now() + newAllocations.length,
        document_id: invoice.id,
        document_number: invoice.document_number,
        document_date: invoice.document_date,
        total_amount: invoice.total_amount,
        allocated_amount: allocatedAmount.toFixed(2),
        balance_amount: balance
      });

      remainingAmount -= allocatedAmount;
    }

    // If there's still unallocated amount, add it as advance payment
    if (remainingAmount > 0 && newAllocations.length > 0) {
      // Add to the last allocation
      const lastAllocation = newAllocations[newAllocations.length - 1];
      const additionalAmount = Math.min(
        remainingAmount, 
        lastAllocation.balance_amount - parseFloat(lastAllocation.allocated_amount)
      );
      
      if (additionalAmount > 0) {
        lastAllocation.allocated_amount = (
          parseFloat(lastAllocation.allocated_amount) + additionalAmount
        ).toFixed(2);
      }
    }

    setAllocations(newAllocations);
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
                  {readOnly ? 'View Payment' : paymentId ? 'Edit Payment' : 'Receive Payment'}
                  {readOnly && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      View Only
                    </span>
                  )}
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
                disabled={readOnly || loading || !formData.customer_id || !formData.amount}
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
      </div> {/* This closes the header div */}

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
                    if (!readOnly) {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }
                  }}
                  onFocus={() => !readOnly && setShowCustomerDropdown(true)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  readOnly={readOnly}
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
                        {customer.customer_type === 'b2b' && customer.company_name && (
                          <div className="text-xs text-gray-600">{customer.company_name}</div>
                        )}
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
                    {selectedCustomer.customer_type === 'b2b' && selectedCustomer.company_name && (
                      <div className="text-xs text-gray-700 font-medium mb-0.5">{selectedCustomer.company_name}</div>
                    )}
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
                      onChange={(date) => !readOnly && setFormData(prev => ({ ...prev, payment_date: date }))}
                      required
                      className="custom-datepicker"
                      disabled={readOnly}
                    />
                  </div>
                  
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => !readOnly && setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                      readOnly={readOnly}
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
                      onChange={(e) => !readOnly && setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      disabled={readOnly}
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
                        onChange={(value) => !readOnly && setFormData(prev => ({ ...prev, bank_account_id: value }))}
                        options={bankAccounts.map(account => ({
                          value: account.id,
                          label: `${account.account_name} (${account.account_number.slice(-4)})`
                        }))}
                        placeholder="Select bank account"
                        disabled={readOnly}
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  {formData.payment_method === 'cheque' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Cheque Number
                      </label>
                      <input
                        type="text"
                        value={formData.cheque_number}
                        onChange={(e) => !readOnly && setFormData(prev => ({ ...prev, cheque_number: e.target.value }))}
                        placeholder="Enter cheque number"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={readOnly}
                      />
                    </div>
                  )}
                  
                  {formData.payment_method === 'upi' && formData.bank_account_id && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        UPI ID
                      </label>
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={selectedBankAccount?.upi_id || ''}
                          readOnly
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                        />
                        {selectedBankAccount?.upi_id && (
                          <button
                            type="button"
                            onClick={() => {
                              // Show UPI QR code
                              alert(`UPI QR Code for ${selectedBankAccount.upi_id} would be displayed here`)
                            }}
                            className="ml-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            title="Show UPI QR Code"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M5 8h2a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1zm12 0h2a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v3a1 1 0 001 1zM5 20h2a1 1 0 001-1v-3a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {(formData.payment_method === 'cheque' || formData.payment_method === 'upi') && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={formData.reference_number}
                        onChange={(e) => !readOnly && setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                        placeholder="Cheque number, UPI ID, etc."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={readOnly}
                      />
                    </div>
                  )}
                </div>
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
              
              {/* Auto Allocate Button */}
              <div className="mt-3 pt-2 border-t border-gray-700">
                <button
                  onClick={autoAllocatePayments}
                  disabled={readOnly || !formData.amount || parseFloat(formData.amount) <= 0 || invoices.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Wand2 className="w-3 h-3" />
                  Auto Allocate to Oldest Invoices
                </button>
              </div>
            </div>

            <div className="p-3 space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => !readOnly && setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes for this payment..."
                  readOnly={readOnly}
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={autoAllocatePayments}
                  icon={<Wand2 className="w-4 h-4" />}
                  size="sm"
                  disabled={readOnly || !formData.amount || parseFloat(formData.amount) <= 0 || invoices.length === 0}
                >
                  Auto Allocate
                </Button>
                <Button
                  variant="outline"
                  onClick={addAllocation}
                  icon={<Plus className="w-4 h-4" />}
                  size="sm"
                  disabled={readOnly}
                >
                  Add Allocation
                </Button>
              </div>
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
                          <div className="flex justify-center gap-2 mt-3">
                            <Button
                              variant="outline"
                              onClick={autoAllocatePayments}
                              icon={<Wand2 className="w-4 h-4" />}
                              className="mt-2"
                              size="sm"
                              disabled={!formData.amount || parseFloat(formData.amount) <= 0 || invoices.length === 0}
                            >
                              Auto Allocate
                            </Button>
                            <Button
                              variant="outline"
                              onClick={addAllocation}
                              icon={<Plus className="w-4 h-4" />}
                              className="mt-2"
                              size="sm"
                            >
                              Add Allocation
                            </Button>
                          </div>
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
                                <div className="text-xs text-gray-500">
                                  Total: ₹{(allocation.total_amount || 0).toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <Select
                                value={allocation.document_id}
                                onChange={(value) => !readOnly && handleAllocationChange(index, 'document_id', value)}
                                options={invoices.map(invoice => ({
                                  value: invoice.id,
                                  label: `${invoice.document_number} (₹${(invoice.total_amount || 0).toFixed(2)}) - Bal: ₹${(invoice.balance_amount || 0).toFixed(2)}`
                                }))}
                                placeholder="Select invoice"
                                className="w-48"
                                disabled={readOnly}
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
                              onChange={(e) => !readOnly && handleAllocationChange(index, 'allocated_amount', e.target.value)}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              readOnly={readOnly}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => !readOnly && removeAllocation(index)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              disabled={readOnly}
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