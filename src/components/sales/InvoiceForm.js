// src/components/sales/InvoiceForm.js - COMPLETE UPDATED FIX WITH LOGGING
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
import { getGSTType } from '../../lib/constants';
import {
  ArrowLeft,
  Save,
  Printer,
  Calculator,
  Users,
  FileText,
  Search,
  Trash2,
  Loader2,
  Package,
  Phone,
  MapPin,
  Mail,
  ChevronDown,
  ChevronUp,
  PercentSquare,
  AlertCircle,
  TrendingDown,
  Scan
} from 'lucide-react';
import WorkforceTaskMonitor from '../workforce/WorkforceTaskMonitor';

const InvoiceForm = ({ invoiceId, companyId, salesOrderId }) => {
  const router = useRouter();
  const { company } = useAuth();
  const { branches, selectedBranch, selectBranch } = useBranch();
  const { success: showSuccess, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();
  const { fetchCustomers: fetchCustomerData, customers: fetchedCustomers } = useCustomers();
  
  const initializationRef = useRef(false);
  const savingRef = useRef(false);
  const [expandedCustomer, setExpandedCustomer] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDueDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 30);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [invoiceNumber, setInvoiceNumber] = useState('Select Branch...');
  const [formData, setFormData] = useState({
    customer_id: '',
    sales_order_id: salesOrderId || null,
    document_date: getTodayDate(),
    due_date: getDueDate(),
    notes: '',
    terms_conditions: '',
    payment_status: 'unpaid',
    discount_percentage: 0,
    discount_amount: 0,
    gst_type: null
  });

  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceBranch, setInvoiceBranch] = useState(null);
  const [creditInfo, setCreditInfo] = useState(null);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // Workforce task state
  const [workforceTaskId, setWorkforceTaskId] = useState(null);
  const [showWorkforceMonitor, setShowWorkforceMonitor] = useState(false);
  const [sendingToWorkforce, setSendingToWorkforce] = useState(false);

  // ✅ HELPER: Get tax rate value from item
  const getTaxRateValue = (item) => {
    // Priority 1: Direct tax_rate field on item
    if (item.tax_rate && item.tax_rate > 0) {
      console.log(`✅ Using item.tax_rate: ${item.tax_rate} for ${item.item_name}`);
      return item.tax_rate;
    }
    
    // Priority 2: Look up in taxRates using tax_rate_id
    if (item.tax_rate_id && taxRates.length > 0) {
      const found = taxRates.find(t => t.id === item.tax_rate_id);
      if (found && found.tax_rate > 0) {
        console.log(`✅ Using taxRates lookup: ${found.tax_rate} for ${item.item_name}`);
        return found.tax_rate;
      }
    }
    
    // Priority 3: Fallback to gst_rate field
    if (item.gst_rate && item.gst_rate > 0) {
      console.log(`✅ Using item.gst_rate: ${item.gst_rate} for ${item.item_name}`);
      return item.gst_rate;
    }
    
    // Priority 4: Return 0 if nothing found
    console.log(`⚠️ No tax rate found for ${item.item_name}`);
    return 0;
  };

  // ✅ IMPROVED: Helper function to get tax information for an item
  const getTaxInfoForItem = (item, gstType) => {
    const taxRateValue = getTaxRateValue(item);

    if (taxRateValue > 0) {
      if (gstType === 'intrastate') {
        return {
          tax_rate: taxRateValue,
          cgst_rate: taxRateValue / 2,
          sgst_rate: taxRateValue / 2,
          igst_rate: 0
        };
      } else {
        return {
          tax_rate: taxRateValue,
          cgst_rate: 0,
          sgst_rate: 0,
          igst_rate: taxRateValue
        };
      }
    }

    return {
      tax_rate: 0,
      cgst_rate: 0,
      sgst_rate: 0,
      igst_rate: 0
    };
  };

  // Add this useEffect to handle complete form reset when switching between new and edit modes
  // and when the refresh parameter changes
  useEffect(() => {
    // When we're creating a new invoice (no invoiceId), reset all form state
    if (!invoiceId) {
      // Reset form data to initial values
      setFormData({
        customer_id: '',
        sales_order_id: salesOrderId || null,
        document_date: getTodayDate(),
        due_date: getDueDate(),
        notes: '',
        terms_conditions: '',
        payment_status: 'unpaid',
        discount_percentage: 0,
        discount_amount: 0,
        gst_type: null
      });
      
      // Reset all other state variables
      setItems([]);
      setSelectedCustomer(null);
      setInvoiceBranch(null);
      setCreditInfo(null);
      setCustomerSearch('');
      setShowCustomerDropdown(false);
      setShowItemDropdown(false);
      setInvoiceNumber('Select Branch...');
      
      // Reset the initialization ref so data can be reloaded
      initializationRef.current = false;
    }
  }, [invoiceId, salesOrderId]);
  
  useEffect(() => {
    let isMounted = true;

    const initializeForm = async () => {
      // Always re-initialize when creating a new invoice
      if (!invoiceId) {
        initializationRef.current = false;
      }
      
      // Skip if already initialized and we're in edit mode
      if (initializationRef.current && invoiceId) return;

      initializationRef.current = true;

      try {
        if (!invoiceId && isMounted) {
          setInvoiceNumber('Select Branch...');
        }

        if (companyId && isMounted) {
          const startTime = performance.now();
          
          // Load tax rates first
          await fetchTaxRates();
          
          // Then load other data
          await Promise.all([
            fetchCustomerData(companyId),
            fetchItems(),
            fetchUnits()
          ]);
          
          const endTime = performance.now();
          console.log(`✅ Master data loaded in ${(endTime - startTime).toFixed(0)}ms`);
        }
        
        if (invoiceId && isMounted) {
          await fetchInvoice();
        } else if (salesOrderId && isMounted) {
          await loadSalesOrder();
        } else if (!invoiceId && isMounted) {
          // Reset form for new invoice
          setFormData({
            customer_id: '',
            sales_order_id: salesOrderId || null,
            document_date: getTodayDate(),
            due_date: getDueDate(),
            notes: '',
            terms_conditions: '',
            payment_status: 'unpaid',
            discount_percentage: 0,
            discount_amount: 0,
            gst_type: null
          });
          setItems([]);
          setSelectedCustomer(null);
          setCustomerSearch('');
          setCreditInfo(null);
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        if (isMounted && !invoiceId) {
          setInvoiceNumber('INV-0001/25-26');
        }
      }
    };

    initializeForm();

    return () => {
      isMounted = false;
    };
  }, [companyId, invoiceId, salesOrderId]);

  useEffect(() => {
    setCustomers(fetchedCustomers);
  }, [fetchedCustomers]);

  useEffect(() => {
    if (invoiceId && initializationRef.current) {
      fetchInvoice();
    }
  }, [invoiceId]);

  useEffect(() => {
    if (salesOrderId && !invoiceId && initializationRef.current) {
      loadSalesOrder();
    }
  }, [salesOrderId]);

  useEffect(() => {
    if (!invoiceId && selectedBranch?.id && initializationRef.current && companyId) {
      setInvoiceNumber('Loading...');
      fetchNextInvoiceNumber();
    }
  }, [selectedBranch?.id]);

  useEffect(() => {
    if (selectedCustomer && company?.address?.state && selectedCustomer.billing_address?.state) {
      const gstType = getGSTType(company.address.state, selectedCustomer.billing_address.state);
      setFormData(prev => ({ ...prev, gst_type: gstType }));
      updateItemsWithGSTType(gstType);
    }
  }, [selectedCustomer, company?.address?.state]);

  useEffect(() => {
    if (selectedCustomer?.id && companyId) {
      fetchCustomerCreditInfo(selectedCustomer.id);
      if (selectedCustomer.discount_percentage > 0) {
        setFormData(prev => ({
          ...prev,
          discount_percentage: parseFloat(selectedCustomer.discount_percentage),
          discount_amount: 0
        }));
      }
    }
  }, [selectedCustomer?.id, companyId]);

  const fetchCustomerCreditInfo = async (customerId) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/credit-info?company_id=${companyId}`);
      const data = await response.json();
      
      if (data.success) {
        setCreditInfo(data.data);
      }
    } catch (error) {
      console.error('Error fetching credit info:', error);
    }
  };

  const updateItemsWithGSTType = (gstType) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.tax_rate > 0) {
          const taxInfo = getTaxInfoForItem(item, gstType);

          // Recalculate using taxable amount (which was already reverse-calculated)
          const cgstAmount = (item.taxable_amount * taxInfo.cgst_rate) / 100;
          const sgstAmount = (item.taxable_amount * taxInfo.sgst_rate) / 100;
          const igstAmount = (item.taxable_amount * taxInfo.igst_rate) / 100;

          return {
            ...item,
            cgst_rate: taxInfo.cgst_rate,
            sgst_rate: taxInfo.sgst_rate,
            igst_rate: taxInfo.igst_rate,
            cgst_amount: cgstAmount,
            sgst_amount: sgstAmount,
            igst_amount: igstAmount,
            // total_amount stays the same (rate with tax)
            total_amount: item.taxable_amount + cgstAmount + sgstAmount + igstAmount
          };
        }
        return item;
      });
    });
  };

  const fetchNextInvoiceNumber = async () => {
    let url = `/api/settings/document-numbering?company_id=${companyId}&document_type=invoice&action=preview`;
    
    if (selectedBranch?.id) {
      url += `&branch_id=${selectedBranch.id}`;
    }
    
    const apiCall = async () => {
      return await authenticatedFetch(url);
    };

    const result = await executeRequest(apiCall);
    
    if (result.success && result.data?.preview) {
      setInvoiceNumber(result.data.preview);
    } else {
      setInvoiceNumber('INV-0001/25-26');
    }
  };

  // ✅ FIXED: fetchItems with proper tax rate handling
  const fetchItems = async () => {
    try {
      console.log('📦 Fetching items...');
      // ✅ FIXED: Use proper limit that doesn't exceed API maximum (50 items)
      const response = await authenticatedFetch(`/api/items?company_id=${companyId}&limit=50&is_active=true&is_for_sale=true`);
      if (response.success) {
        const data = response.data || [];
        console.log(`📦 Items fetched: ${data.length} items`);
        
        // Log first item to see structure
        if (data.length > 0) {
          console.log('🔍 FIRST ITEM STRUCTURE:', data[0]);
          console.log('🔍 Available fields:', Object.keys(data[0]));
        }

        const processedItems = data.map((item, idx) => {
          const taxRateValue = getTaxRateValue(item);

          if (idx === 0 || idx === 1) {
            console.log(`📌 Item ${idx}: ${item.item_name} -> tax_rate: ${taxRateValue}`);
          }

          return {
            ...item,
            effective_selling_price: item.selling_price_with_tax || item.selling_price || item.purchase_price || 0,
            tax_rate: taxRateValue || item.tax_rate || 0
          };
        });

        setAvailableItems(processedItems);
        console.log('✅ Items processed and set');
      } else {
        // Handle API error response
        console.error('❌ Items API returned error:', response.error);
        showError(response.error || 'Failed to load items. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      showError('Failed to load items. Please try again.');
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await authenticatedFetch(`/api/master-data/units?company_id=${companyId}`);
      if (response.success) {
        setUnits(response.data || []);
        console.log(`✅ Units loaded: ${response.data?.length || 0}`);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const fetchTaxRates = async () => {
    try {
      console.log('💰 Fetching tax rates...');
      const response = await authenticatedFetch(`/api/master-data/tax-rates?company_id=${companyId}`);
      if (response.success) {
        const rates = response.data || [];
        setTaxRates(rates);
        console.log(`✅ Tax rates loaded: ${rates.length} rates`);
        rates.forEach((rate, idx) => {
          console.log(`  [${idx}] ID: ${rate.id} | Rate: ${rate.tax_rate}%`);
        });
        return rates;
      }
    } catch (error) {
      console.error('Error fetching tax rates:', error);
    }
    return [];
  };

  const fetchInvoice = async () => {
    try {
      const response = await authenticatedFetch(`/api/sales/invoices/${invoiceId}?company_id=${companyId}`);
      
      if (response.success && response.data) {
        const invoice = response.data;
        
        setFormData({
          customer_id: invoice.customer_id,
          sales_order_id: invoice.sales_order_id,
          document_date: invoice.document_date,
          due_date: invoice.due_date,
          notes: invoice.notes || '',
          terms_conditions: invoice.terms_conditions || '',
          payment_status: invoice.payment_status,
          discount_percentage: invoice.discount_percentage || 0,
          discount_amount: invoice.discount_amount || 0,
          gst_type: invoice.gst_type
        });

        setInvoiceNumber(invoice.document_number);
        
        if (invoice.customer) {
          setSelectedCustomer(invoice.customer);
          setCustomerSearch(invoice.customer.name);
        }

        if (invoice.branch) {
          setInvoiceBranch(invoice.branch);
        }

        if (invoice.items && invoice.items.length > 0) {
          const formattedItems = invoice.items.map(item => ({
            id: item.id,
            item_id: item.item_id,
            item_code: item.item_code,
            item_name: item.item_name,
            quantity: item.quantity,
            rate: item.rate,
            unit_id: item.unit_id,
            unit_name: item.unit_name,
            hsn_sac_code: item.hsn_sac_code,
            discount_percentage: item.discount_percentage || 0,
            discount_amount: item.discount_amount || 0,
            taxable_amount: item.taxable_amount,
            tax_rate: item.tax_rate,
            cgst_rate: item.cgst_rate,
            sgst_rate: item.sgst_rate,
            igst_rate: item.igst_rate,
            cgst_amount: item.cgst_amount,
            sgst_amount: item.sgst_amount,
            igst_amount: item.igst_amount,
            total_amount: item.total_amount,
            mrp: item.mrp || item.item?.mrp || null,
            purchase_price: item.purchase_price || item.item?.purchase_price || null,
            selling_price: item.selling_price || item.item?.selling_price || null
          }));
          setItems(formattedItems);
        }
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      showError('Failed to load invoice');
    }
  };

  const loadSalesOrder = async () => {
    try {
      const response = await authenticatedFetch(`/api/sales/sales-orders/${salesOrderId}?company_id=${companyId}`);
      
      if (response.success && response.data) {
        const salesOrder = response.data;
        
        setFormData(prev => ({
          ...prev,
          customer_id: salesOrder.customer_id,
          sales_order_id: salesOrderId,
          document_date: getTodayDate(),
          due_date: getDueDate(),
          notes: salesOrder.notes || '',
          terms_conditions: salesOrder.terms_conditions || '',
          discount_percentage: salesOrder.discount_percentage || 0,
          discount_amount: salesOrder.discount_amount || 0
        }));

        if (salesOrder.customer) {
          setSelectedCustomer(salesOrder.customer);
          setCustomerSearch(salesOrder.customer.name);
        }

        if (salesOrder.items && salesOrder.items.length > 0) {
          const formattedItems = salesOrder.items.map(item => ({
            id: Date.now() + Math.random(),
            item_id: item.item_id,
            item_code: item.item_code,
            item_name: item.item_name,
            quantity: item.quantity,
            rate: item.rate,
            unit_id: item.unit_id,
            unit_name: item.unit_name,
            hsn_sac_code: item.hsn_sac_code,
            discount_percentage: item.discount_percentage || 0,
            discount_amount: item.discount_amount || 0,
            taxable_amount: item.taxable_amount,
            tax_rate: item.tax_rate,
            cgst_rate: item.cgst_rate,
            sgst_rate: item.sgst_rate,
            igst_rate: item.igst_rate,
            cgst_amount: item.cgst_amount,
            sgst_amount: item.sgst_amount,
            igst_amount: item.igst_amount,
            total_amount: item.total_amount,
            mrp: item.mrp || item.item?.mrp || null,
            purchase_price: item.purchase_price || item.item?.purchase_price || null,
            selling_price: item.selling_price || item.item?.selling_price || null
          }));
          setItems(formattedItems);
        }
      }
    } catch (error) {
      console.error('Error loading sales order:', error);
      showError('Failed to load sales order data');
    }
  };

  const filteredCustomers = customers.filter(customer =>
    (customer?.name?.toLowerCase() || '').includes(customerSearch.toLowerCase()) ||
    (customer?.company_name?.toLowerCase() || '').includes(customerSearch.toLowerCase()) ||
    (customer?.customer_code?.toLowerCase() || '').includes(customerSearch.toLowerCase()) ||
    (customer?.email?.toLowerCase() || '').includes(customerSearch.toLowerCase()) ||
    (customer?.phone?.toLowerCase() || '').includes(customerSearch.toLowerCase())
  ).sort((a, b) => {
    if (a.customer_type === 'b2b' && b.customer_type !== 'b2b') return -1;
    if (a.customer_type !== 'b2b' && b.customer_type === 'b2b') return 1;
    return 0;
  });
  
  const filteredItems = availableItems.filter(item => {
    const search = itemSearch.toLowerCase();
    return (
      item.item_name.toLowerCase().includes(search) ||
      item.item_code.toLowerCase().includes(search) ||
      (item.barcodes && Array.isArray(item.barcodes) &&
        item.barcodes.some(barcode => barcode && barcode.toLowerCase().includes(search)))
    );
  });

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.customer_type === 'b2b' ? (customer.company_name || customer.name) : customer.name);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    
    if (companyId && customer.company_id && customer.company_id !== companyId) {
      showError('Selected customer belongs to a different company.');
    }
    
    setShowCustomerDropdown(false);
  };

  // ✅ FIXED: handleItemSelect with better tax handling and no toast for barcode scans
  const handleItemSelect = (item, fromBarcode = false) => {
    console.log(`\n🛒 Selecting item: ${item.item_name}${fromBarcode ? ' (via Barcode)' : ''}`);
    console.log(`   Item data:`, item);

    const unit = units.find(u => u.id === item.primary_unit_id);

    const existingItemIndex = items.findIndex(i => i.item_id === item.id);

    if (existingItemIndex !== -1) {
      const updatedItems = [...items];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + 1
      };

      const recalculatedItems = calculateLineAmounts(updatedItems, existingItemIndex);
      setItems(recalculatedItems);

      // Don't show success feedback for barcode scan to avoid toast notifications
      // if (fromBarcode) {
      //   showSuccess(`✓ ${item.item_name} (Qty: ${updatedItems[existingItemIndex].quantity + 1})`);
      // }
    } else {
      const gstType = company?.address?.state && selectedCustomer?.billing_address?.state
        ? getGSTType(company.address.state, selectedCustomer.billing_address.state)
        : formData.gst_type || 'intrastate';

      console.log(`   GST Type: ${gstType}`);

      const taxInfo = getTaxInfoForItem(item, gstType);
      
      console.log(`   Tax Info:`, taxInfo);

      // Use the effective selling price as the rate (this is the price including tax)
      // If selling_price_with_tax exists, use that; otherwise fallback to selling_price or purchase_price
      const rateIncludingTax = item.effective_selling_price || item.selling_price_with_tax || item.selling_price || item.purchase_price || 0;
      const taxRate = taxInfo.tax_rate || 0;
      
      // Calculate the taxable amount (price excluding tax) from the price including tax
      const rateExcludingTax = taxRate > 0 
        ? rateIncludingTax / (1 + taxRate / 100)
        : rateIncludingTax;

      const newItem = {
        id: Date.now() + Math.random(),
        item_id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || '',
        rate: rateIncludingTax, // Store and display the rate including tax as received
        quantity: 1,
        unit_id: item.primary_unit_id,
        unit_name: unit?.unit_name || item.primary_unit?.unit_name || '',
        hsn_sac_code: item.hsn_sac_code || '',
        discount_percentage: 0,
        discount_amount: 0,
        taxable_amount: rateExcludingTax, // Store the calculated taxable amount (excluding tax)
        tax_rate: taxInfo.tax_rate,
        cgst_rate: taxInfo.cgst_rate,
        sgst_rate: taxInfo.sgst_rate,
        igst_rate: taxInfo.igst_rate,
        cgst_amount: (rateExcludingTax * taxInfo.cgst_rate) / 100,
        sgst_amount: (rateExcludingTax * taxInfo.sgst_rate) / 100,
        igst_amount: (rateExcludingTax * taxInfo.igst_rate) / 100,
        total_amount: rateIncludingTax, // For single quantity, total is the same as rate
        mrp: item.mrp || null,
        purchase_price: item.purchase_price || null,
        selling_price: item.selling_price || null
      };

      console.log(`   ✅ New item created with tax_rate: ${newItem.tax_rate}`);

      const newItems = [...items, newItem];
      setItems(newItems);
      recalculateItemAmounts(newItems);

      // Don't show success feedback for barcode scan to avoid toast notifications
      // if (fromBarcode) {
      //   showSuccess(`✓ Added: ${item.item_name}`);
      // }
    }

    setItemSearch('');
    setShowItemDropdown(false);
  };

  // Add useEffect to automatically process barcode scans
  useEffect(() => {
    // Only process if there's search text and it looks like a barcode (not a regular search)
    if (itemSearch && itemSearch.trim() && !itemSearch.includes(' ')) {
      // Debounce the search to avoid multiple rapid scans
      const timeoutId = setTimeout(() => {
        // Check if this looks like a barcode (numbers/letters without spaces)
        const isLikelyBarcode = /^[a-zA-Z0-9\-_]+$/.test(itemSearch.trim());
        if (isLikelyBarcode) {
          processBarcodeSearch(itemSearch);
        }
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [itemSearch]);

  // Handle barcode scan with Enter key
  const handleItemSearchKeyDown = async (e) => {
    if (e.key === 'Enter' && itemSearch.trim()) {
      e.preventDefault();
      await processBarcodeSearch(itemSearch);
    }
  };

  // Process barcode search without requiring Enter key press
  const processBarcodeSearch = async (searchText) => {
    if (!searchText.trim()) return;

    const searchLower = searchText.toLowerCase();
    const searchTrim = searchText.trim();

    console.log('🔍 Barcode/Item search triggered:', searchTrim);

    // First, try exact match by barcode (from barcodes array) or item_code
    const exactMatch = availableItems.find(item => {
      // Check item_code exact match
      if (item.item_code && item.item_code.toLowerCase() === searchLower) {
        return true;
      }
      // Check barcodes array for exact match
      if (item.barcodes && Array.isArray(item.barcodes)) {
        return item.barcodes.some(barcode =>
          barcode && barcode.toLowerCase() === searchLower
        );
      }
      return false;
    });

    if (exactMatch) {
      // Exact match found - add it automatically
      console.log('✅ Barcode/Item Code matched - Auto-adding item:', exactMatch.item_name);
      handleItemSelect(exactMatch, true); // true = from barcode
      return;
    }

    // If no exact match, try barcode validation API as fallback
    // This helps when items list might not be fully loaded
    try {
      const response = await fetch(
        `/api/items/validate-barcode?barcode=${encodeURIComponent(searchTrim)}&company_id=${companyId}`
      );
      const result = await response.json();

      if (result.success && !result.available && result.existingItem) {
        // Barcode found in database - fetch full item details
        console.log('📦 Barcode found via API:', {
          itemName: result.existingItem.item_name,
          itemId: result.existingItem.id
        });

        // Find the item in availableItems or fetch it
        const itemInList = availableItems.find(item => item.id === result.existingItem.id);

        if (itemInList) {
          console.log('✅ Item found in current list - adding directly');
          handleItemSelect(itemInList, true); // true = from barcode
        } else {
          // Item not in current list, fetch it
          console.log('⏳ Item not in list - fetching full details from API...');
          const itemResponse = await fetch(`/api/items/${result.existingItem.id}?company_id=${companyId}`);
          const itemResult = await itemResponse.json();

          console.log('📥 Fetched item result:', {
            success: itemResult.success,
            hasData: !!itemResult.data,
            itemName: itemResult.data?.item_name
          });

          if (itemResult.success && itemResult.data) {
            console.log('✅ Adding fetched item to invoice');
            handleItemSelect(itemResult.data, true); // true = from barcode
          } else {
            console.error('❌ Failed to load item details:', itemResult);
            // Don't show error for barcode scans to avoid toast notifications
            // showError('Found item but could not load details');
          }
        }
        return;
      }
    } catch (error) {
      console.error('Barcode API error:', error);
      // Continue with regular flow if API fails
    }

    // Fallback to filtered results
    if (filteredItems.length === 1) {
      // Only one match in filtered results - select it
      console.log('📦 Single match found - Auto-adding item:', filteredItems[0].item_name);
      handleItemSelect(filteredItems[0], true); // true = from barcode
    } else if (filteredItems.length > 1) {
      // Multiple matches - keep dropdown open for manual selection
      setShowItemDropdown(true);
    } else {
      // No matches - don't show error to avoid toast notifications
      // showError('No item found matching: ' + itemSearch);
      setItemSearch('');
    }
  };

  // ✅ ADD MISSING FUNCTION: handleItemChange
  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      const parsedValue = ['quantity', 'rate', 'discount_percentage', 'mrp'].includes(field) 
        ? parseFloat(value) || 0 
        : value;
      
      newItems[index] = { ...newItems[index], [field]: parsedValue };
      return calculateLineAmounts(newItems, index);
    });
  };

  const calculateLineAmounts = (items, index) => {
    const item = items[index];
    const quantity = parseFloat(item.quantity) || 0;
    const rateIncludingTax = parseFloat(item.rate) || 0; // This is the rate including tax
    const discountPercentage = parseFloat(item.discount_percentage) || 0;
    const taxRate = parseFloat(item.tax_rate) || 0;

    // Calculate line amount (quantity * rate including tax)
    const lineAmountWithTax = quantity * rateIncludingTax;

    // Apply discount on the line amount (with tax)
    const discountAmount = (lineAmountWithTax * discountPercentage) / 100;
    const lineAmountAfterDiscount = lineAmountWithTax - discountAmount;

    // Calculate taxable amount (amount excluding tax) from the discounted amount
    const taxableAmount = taxRate > 0
      ? lineAmountAfterDiscount / (1 + taxRate / 100)
      : lineAmountAfterDiscount;

    // Calculate tax amounts on the taxable amount
    const cgstAmount = (taxableAmount * (parseFloat(item.cgst_rate) || 0)) / 100;
    const sgstAmount = (taxableAmount * (parseFloat(item.sgst_rate) || 0)) / 100;
    const igstAmount = (taxableAmount * (parseFloat(item.igst_rate) || 0)) / 100;

    items[index] = {
      ...item,
      discount_amount: discountAmount,
      taxable_amount: taxableAmount, // Store amount excluding tax
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      total_amount: lineAmountAfterDiscount // Store total including tax
    };

    return items;
  };

  const recalculateItemAmounts = (itemsToRecalculate) => {
    let updatedItems = [...itemsToRecalculate];

    updatedItems = updatedItems.map((item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rateIncludingTax = parseFloat(item.rate) || 0; // This is the rate including tax
      const discountPercentage = parseFloat(item.discount_percentage) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;

      // Calculate line amount (quantity * rate including tax)
      const lineAmountWithTax = quantity * rateIncludingTax;

      // Apply discount on the line amount (with tax)
      const discountAmount = (lineAmountWithTax * discountPercentage) / 100;
      const lineAmountAfterDiscount = lineAmountWithTax - discountAmount;

      // Calculate taxable amount (amount excluding tax) from the discounted amount
      const taxableAmount = taxRate > 0
        ? lineAmountAfterDiscount / (1 + taxRate / 100)
        : lineAmountAfterDiscount;

      // Calculate tax amounts on the taxable amount
      const cgstAmount = (taxableAmount * (parseFloat(item.cgst_rate) || 0)) / 100;
      const sgstAmount = (taxableAmount * (parseFloat(item.sgst_rate) || 0)) / 100;
      const igstAmount = (taxableAmount * (parseFloat(item.igst_rate) || 0)) / 100;

      return {
        ...item,
        discount_amount: discountAmount,
        taxable_amount: taxableAmount, // Store amount excluding tax
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        total_amount: lineAmountAfterDiscount // Store total including tax
      };
    });

    setItems(updatedItems);
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.taxable_amount) || 0), 0);
    const cgst = items.reduce((sum, item) => sum + (parseFloat(item.cgst_amount) || 0), 0);
    const sgst = items.reduce((sum, item) => sum + (parseFloat(item.sgst_amount) || 0), 0);
    const igst = items.reduce((sum, item) => sum + (parseFloat(item.igst_amount) || 0), 0);
    const totalTax = cgst + sgst + igst;

    const beforeDiscount = subtotal + totalTax;
    const discountAmount = formData.discount_percentage
      ? (beforeDiscount * parseFloat(formData.discount_percentage)) / 100
      : parseFloat(formData.discount_amount) || 0;

    const total = beforeDiscount - discountAmount;
    const roundOff = Math.round(total) - total;

    return {
      subtotal,
      cgst,
      sgst,
      igst,
      totalTax,
      beforeDiscount,
      discountAmount,
      roundOff,
      total: Math.round(total)
    };
  };

  const validateForm = async () => {
    const customerExists = customers.some(customer => customer.id === formData.customer_id);
    
    if (!formData.customer_id) {
      showError('Please select a customer');
      return false;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formData.customer_id)) {
      showError('Invalid customer selected.');
      return false;
    }

    if (!customerExists) {
      showError('Selected customer not found.');
      return false;
    }

    if (items.length === 0) {
      showError('Please add at least one item');
      return false;
    }

    const invalidItems = items.filter(item => item.quantity <= 0 || item.rate < 0);
    if (invalidItems.length > 0) {
      showError('Please fill all item details correctly');
      return false;
    }

    if (creditInfo && !creditInfo.can_create_invoice) {
      showError(`⚠️ ${creditInfo.summary.display_text}`);
      return false;
    }

    return true;
  };

  // ===== WORKFORCE HANDLERS =====

  const handleSendToWorkforce = async () => {
    // Validate customer is selected
    if (!selectedCustomer) {
      showError('Please select a customer before sending to workforce');
      return;
    }

    try {
      setSendingToWorkforce(true);

      const response = await authenticatedFetch('/api/workforce/tasks', {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name || selectedCustomer.company_name
        })
      });

      const result = await response.json();

      if (result.success) {
        setWorkforceTaskId(result.data.id);
        setShowWorkforceMonitor(true);
        showSuccess('Task sent to workforce! Waiting for acceptance...');
        console.log('✅ Workforce task created:', result.data.id);
      } else {
        showError(result.error || 'Failed to send task to workforce');
      }
    } catch (error) {
      console.error('Error sending to workforce:', error);
      showError('Failed to send task to workforce');
    } finally {
      setSendingToWorkforce(false);
    }
  };

  const handleWorkforceItemsReceived = (scannedItems) => {
    console.log('📦 Received scanned items from workforce:', scannedItems.length);

    if (!scannedItems || scannedItems.length === 0) {
      showError('No items were scanned');
      return;
    }

    // Convert scanned items to invoice items format
    const newItems = [];

    scannedItems.forEach((scannedItem) => {
      // Find full item details from availableItems
      const fullItem = availableItems.find(item => item.id === scannedItem.item_id);

      if (fullItem) {
        // Use the same logic as handleItemSelect
        const taxInfo = getTaxInfoForItem(fullItem, formData.gst_type);
        const rate = fullItem.selling_price_with_tax || fullItem.selling_price || scannedItem.mrp || 0;
        const quantity = scannedItem.quantity || 1;
        const lineAmount = rate * quantity;
        const discountPercentage = 0;
        const discountAmount = (lineAmount * discountPercentage) / 100;
        const taxableAmount = lineAmount - discountAmount;

        const cgstAmount = (taxableAmount * taxInfo.cgst_rate) / 100;
        const sgstAmount = (taxableAmount * taxInfo.sgst_rate) / 100;
        const igstAmount = (taxableAmount * taxInfo.igst_rate) / 100;
        const totalAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount;

        newItems.push({
          id: Date.now() + Math.random(),
          item_id: fullItem.id,
          item_code: fullItem.item_code,
          item_name: fullItem.item_name,
          quantity: quantity,
          rate: rate,
          unit_id: fullItem.unit_id,
          unit_name: fullItem.unit?.name || 'PCS',
          hsn_sac_code: fullItem.hsn_sac_code,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
          taxable_amount: taxableAmount,
          tax_rate: taxInfo.tax_rate,
          cgst_rate: taxInfo.cgst_rate,
          sgst_rate: taxInfo.sgst_rate,
          igst_rate: taxInfo.igst_rate,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          igst_amount: igstAmount,
          total_amount: totalAmount,
          mrp: fullItem.mrp || scannedItem.mrp,
          purchase_price: fullItem.purchase_price,
          selling_price: fullItem.selling_price
        });
      } else {
        console.warn('⚠️ Item not found in availableItems:', scannedItem.item_id);
      }
    });

    // Add new items to invoice
    setItems(prevItems => [...prevItems, ...newItems]);
    setShowWorkforceMonitor(false);
    setWorkforceTaskId(null);
    showSuccess(`✓ Added ${newItems.length} items from workforce scan`);
  };

  const handleWorkforceTaskCancel = () => {
    setShowWorkforceMonitor(false);
    setWorkforceTaskId(null);
    showSuccess('Workforce task cancelled');
  };

  // Terminate workforce task when invoice is saved or closed
  const terminateWorkforceTask = async () => {
    if (!workforceTaskId) return;

    try {
      await authenticatedFetch(`/api/workforce/tasks/${workforceTaskId}`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'terminate' })
      });
      console.log('✅ Workforce task terminated');
    } catch (error) {
      console.error('Error terminating workforce task:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (savingRef.current) {
      return;
    }

    if (!(await validateForm())) return;

    savingRef.current = true;

    const apiCall = async () => {
      const url = invoiceId ? `/api/sales/invoices/${invoiceId}` : '/api/sales/invoices';
      const method = invoiceId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        company_id: companyId,
        items: items.map(item => ({
          item_id: item.item_id,
          item_code: item.item_code,
          item_name: item.item_name,
          quantity: item.quantity,
          rate: item.rate,
          unit_id: item.unit_id,
          unit_name: item.unit_name,
          hsn_sac_code: item.hsn_sac_code,
          discount_percentage: item.discount_percentage,
          discount_amount: item.discount_amount,
          taxable_amount: item.taxable_amount,
          tax_rate: item.tax_rate,
          cgst_rate: item.cgst_rate,
          sgst_rate: item.sgst_rate,
          igst_rate: item.igst_rate,
          cgst_amount: item.cgst_amount,
          sgst_amount: item.sgst_amount,
          igst_amount: item.igst_amount,
          total_amount: item.total_amount,
          mrp: item.mrp,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price
        }))
      };

      if (!invoiceId && selectedBranch?.id) {
        payload.branch_id = selectedBranch.id;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!payload.customer_id || !uuidRegex.test(payload.customer_id)) {
        throw new Error('Invalid or missing customer ID');
      }

      return await authenticatedFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
    };

    const result = await executeRequest(apiCall);

    if (result.success) {
      // Terminate workforce task if exists
      await terminateWorkforceTask();

      showSuccess(`Invoice ${invoiceId ? 'updated' : 'created'} successfully!`);

      // ✅ FIXED: Add refresh flag and use replace to clear history + trigger parent refresh
      setTimeout(() => {
        savingRef.current = false;
        // Use query parameter to signal refresh and clear browser history
        router.replace(`/sales/invoices?refresh=true&ts=${Date.now()}`);
      }, 300);
    } else {
      savingRef.current = false;
      showError(result.error || 'Failed to save invoice.');
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <style jsx>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
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
                  {invoiceId ? 'Edit Invoice' : 'Create Invoice'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <h1 className="text-sm font-semibold text-gray-900">
                    Invoice Number: <span className={invoiceNumber === 'Select Branch...' || invoiceNumber === 'Loading...' ? 'text-gray-400' : 'text-blue-600'}>#{invoiceNumber}</span>
                  </h1>
                  
                  {invoiceId && invoiceBranch ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-sm font-medium text-blue-900">
                        {invoiceBranch.name || invoiceBranch.branch_name}
                      </span>
                    </div>
                  ) : !invoiceId && selectedBranch ? (
                    <div style={{ width: '200px' }}>
                      <Select
                        value={selectedBranch.id}
                        onChange={(value) => selectBranch(value)}
                        options={branches.map(b => ({ value: b.id, label: b.name || b.branch_name }))}
                        placeholder="Select Branch..."
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleSubmit}
                disabled={loading || !formData.customer_id || items.length === 0 || savingRef.current}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading || savingRef.current ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading || savingRef.current ? 'Saving...' : 'Save'}
              </button>
              
              <button className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Top Row */}
        <div className="grid grid-cols-3 gap-4">
          
          {/* CUSTOMER SECTION */}
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
                  Search Customer
                </label>
                <input
                  type="text"
                  placeholder="Search name, company, code, or phone..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-64 overflow-auto shadow-xl">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            {customer.customer_type === 'b2b' && customer.company_name ? (
                              <>
                                <div className="font-semibold text-sm text-gray-900">{customer.company_name}</div>
                                <div className="text-xs text-gray-600">Contact: {customer.name}</div>
                              </>
                            ) : (
                              <div className="font-medium text-sm text-gray-900">{customer.name}</div>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded flex-shrink-0 ${
                            customer.customer_type === 'b2b'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {customer.customer_type === 'b2b' ? 'B2B' : 'B2C'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                          <span className="text-gray-600 font-medium">{customer.customer_code}</span>
                          
                          {customer.phone && (
                            <span className="flex items-center gap-1 text-gray-700">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </span>
                          )}

                          {customer.customer_type === 'b2b' && customer.gstin && (
                            <span className="text-blue-600 font-mono text-xs truncate">
                              📄 {customer.gstin}
                            </span>
                          )}
                        </div>

                        {customer.billing_address && (
                          <div className="flex items-start gap-2 bg-gray-50 px-2 py-1.5 rounded border border-gray-100">
                            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-gray-500" />
                            <div className="flex-1">
                              {customer.billing_address.city && customer.billing_address.state && (
                                <div className="text-xs text-gray-700 font-medium">
                                  {customer.billing_address.city}
                                  <span className="text-gray-500">, {customer.billing_address.state}</span>
                                  {customer.billing_address.pincode && (
                                    <span className="text-gray-500"> - {customer.billing_address.pincode}</span>
                                  )}
                                </div>
                              )}
                              {customer.billing_address.address_line1 && (
                                <div className="text-xs text-gray-500 line-clamp-1">
                                  {customer.billing_address.address_line1}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedCustomer && (
                <div className="flex-1 overflow-y-auto space-y-2">
                  <button 
                    onClick={() => setExpandedCustomer(!expandedCustomer)}
                    className="w-full bg-blue-50 p-2.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {selectedCustomer.customer_type === 'b2b' && selectedCustomer.company_name ? (
                          <>
                            <div className="font-semibold text-gray-900 text-sm truncate">{selectedCustomer.company_name}</div>
                            <div className="text-xs text-gray-600 truncate">Contact: {selectedCustomer.name}</div>
                          </>
                        ) : (
                          <div className="font-semibold text-gray-900 text-sm">{selectedCustomer.name}</div>
                        )}
                        <div className="text-xs text-gray-600">{selectedCustomer.customer_code}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                          selectedCustomer.customer_type === 'b2b'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {selectedCustomer.customer_type === 'b2b' ? 'B2B' : 'B2C'}
                        </span>
                        {expandedCustomer ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                      </div>
                    </div>
                  </button>

                  {expandedCustomer && (
                    <>
                      {selectedCustomer.phone && (
                        <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                          <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-gray-900 font-medium">{selectedCustomer.phone}</span>
                        </div>
                      )}

                      {selectedCustomer.customer_type === 'b2b' && selectedCustomer.gstin && (
                        <div className="px-2.5 py-2 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-xs text-blue-700 font-semibold mb-0.5">GSTIN</div>
                          <div className="text-blue-900 font-mono font-bold text-xs break-all">{selectedCustomer.gstin}</div>
                        </div>
                      )}

                      {selectedCustomer.email && (
                        <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                          <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-gray-900 break-all">{selectedCustomer.email}</span>
                        </div>
                      )}

                      {selectedCustomer.billing_address && (
                        <div className="px-2.5 py-2 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 text-xs">
                              <div className="text-gray-900 font-medium mb-0.5">Address</div>
                              <div className="text-gray-700 space-y-0.5">
                                {selectedCustomer.billing_address.address_line1 && (
                                  <div>{selectedCustomer.billing_address.address_line1}</div>
                                )}
                                {selectedCustomer.billing_address.address_line2 && (
                                  <div>{selectedCustomer.billing_address.address_line2}</div>
                                )}
                                <div>
                                  {selectedCustomer.billing_address.city}
                                  {selectedCustomer.billing_address.city && selectedCustomer.billing_address.state ? ', ' : ''}
                                  {selectedCustomer.billing_address.state}
                                  {selectedCustomer.billing_address.pincode && ` - ${selectedCustomer.billing_address.pincode}`}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {formData.gst_type && (
                        <div className={`px-2.5 py-2 rounded-lg border text-xs font-medium text-center ${
                          formData.gst_type === 'intrastate'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-orange-50 border-orange-200 text-orange-800'
                        }`}>
                          ✓ {formData.gst_type === 'intrastate' ? 'Intrastate (CGST+SGST)' : 'Interstate (IGST)'}
                        </div>
                      )}

                      {selectedCustomer.discount_percentage > 0 && (
                        <div className="px-2.5 py-2 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2">
                            <PercentSquare className="w-4 h-4 text-amber-600" />
                            <div>
                              <div className="text-xs text-amber-700 font-semibold">Customer Discount</div>
                              <div className="text-amber-900 font-bold text-sm">{parseFloat(selectedCustomer.discount_percentage).toFixed(2)}%</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {creditInfo && (
                        <div className={`px-2.5 py-2 rounded-lg border text-xs ${
                          creditInfo.credit_status === 'unlimited' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                          creditInfo.credit_status === 'available' ? 'bg-green-50 border-green-200 text-green-800' :
                          creditInfo.credit_status === 'limited' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                          'bg-red-50 border-red-200 text-red-800'
                        }`}>
                          <div className="flex items-start gap-2">
                            {creditInfo.credit_status !== 'available' && creditInfo.credit_status !== 'unlimited' && (
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-semibold">Credit Status</div>
                              <div className="font-mono text-xs mt-0.5">{creditInfo.summary.display_text}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Details Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Invoice Details</h3>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Invoice Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={formData.document_date}
                      onChange={(date) => setFormData(prev => ({ ...prev, document_date: date }))}
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Due Date
                    </label>
                    <DatePicker
                      value={formData.due_date}
                      onChange={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Payment Status
                  </label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Summary Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Invoice Summary</h3>
              </div>
              
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Subtotal</span>
                  <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                </div>
                
                {formData.gst_type === 'intrastate' ? (
                  <>
                    {totals.cgst > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">CGST</span>
                        <span className="font-medium text-green-400">₹{totals.cgst.toFixed(2)}</span>
                      </div>
                    )}
                    {totals.sgst > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">SGST</span>
                        <span className="font-medium text-green-400">₹{totals.sgst.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {totals.igst > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">IGST</span>
                        <span className="font-medium text-blue-400">₹{totals.igst.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                
                <div className="flex justify-between pt-1.5 border-t border-gray-600">
                  <span className="text-gray-300">Before Discount</span>
                  <span className="font-medium">₹{totals.beforeDiscount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 space-y-2.5">
              <div className="pb-2.5 border-b border-gray-200">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Discount</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Percentage %</label>
                    <input
                      type="number"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        discount_percentage: parseFloat(e.target.value) || 0,
                        discount_amount: 0 
                      }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Amount ₹</label>
                    <input
                      type="number"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        discount_amount: parseFloat(e.target.value) || 0,
                        discount_percentage: 0 
                      }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-green-600 mt-1.5 bg-green-50 px-2 py-1 rounded">
                    <span className="font-medium">Discount Applied</span>
                    <span className="font-semibold">-₹{totals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Round Off</span>
                  <span className={`font-medium ${totals.roundOff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{totals.roundOff.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between text-lg font-bold pt-1.5 border-t-2 border-gray-200">
                  <span className="text-gray-900">TOTAL</span>
                  <span className="text-blue-600">₹{totals.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Items</h3>
              <div className="flex items-center gap-3">
                {/* Send to Workforce Button */}
                {!invoiceId && !showWorkforceMonitor && selectedCustomer && (
                  <button
                    type="button"
                    onClick={handleSendToWorkforce}
                    disabled={sendingToWorkforce}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingToWorkforce ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Scan className="w-4 h-4" />
                        Send to Workforce
                      </>
                    )}
                  </button>
                )}
                <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search items... (scan barcode automatically)"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowItemDropdown(true);
                  }}
                  onKeyDown={handleItemSearchKeyDown}
                  onFocus={() => setShowItemDropdown(true)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                {showItemDropdown && filteredItems.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-60 overflow-auto shadow-xl">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleItemSelect(item)}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-sm text-gray-900">{item.item_name}</div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{item.item_code}</span>
                          {item.hsn_sac_code && (
                            <span className="text-blue-600 font-mono">HSN: {item.hsn_sac_code}</span>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600 font-medium">SP: ₹{(item.selling_price_with_tax || item.selling_price || 0).toFixed(2)} (incl. tax)</span>
                            {item.purchase_price && (
                              <span className="text-amber-600 font-medium flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" />
                                PP: ₹{(item.purchase_price).toFixed(2)}
                              </span>
                            )}
                          </div>
                          {item.mrp && (
                            <div className="text-xs text-slate-600 font-medium">
                              MRP: ₹{(item.mrp).toFixed(2)}
                            </div>
                          )}
                          {item.tax_rate > 0 && (
                            <div className="text-xs text-purple-600 font-medium">
                              💰 Tax: {item.tax_rate.toFixed(2)}% (excl.)
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>

            {/* Workforce Task Monitor */}
            {showWorkforceMonitor && workforceTaskId && (
              <div className="mb-4">
                <WorkforceTaskMonitor
                  taskId={workforceTaskId}
                  onItemsReceived={handleWorkforceItemsReceived}
                  onCancel={handleWorkforceTaskCancel}
                />
              </div>
            )}

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-10">#</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase">Item Name</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">Qty</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-16">Unit</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">Rate <span className="text-xs normal-case text-gray-500">(Incl)</span></th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">MRP</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">PP</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">Disc%</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">Tax</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-28">Amount</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 text-xs text-gray-500 font-medium">{index + 1}</td>
                        <td className="px-3 py-2">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                            <div className="text-xs text-gray-500">HSN: {item.hsn_sac_code || '-'}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0.01"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-2 text-xs text-center text-gray-600">{item.unit_name || '-'}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.mrp || ''}
                            onChange={(e) => handleItemChange(index, 'mrp', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                            placeholder="MRP"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-2 text-xs text-right text-gray-600">
                          {item.purchase_price ? `₹${item.purchase_price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.discount_percentage}
                            onChange={(e) => handleItemChange(index, 'discount_percentage', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            max="100"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-2 text-xs text-center text-gray-600">
                          {formData.gst_type === 'intrastate' ? (
                            <div className="space-y-0.5">
                              <div className="text-green-600 font-medium">C: {parseFloat(item.cgst_rate || 0).toFixed(2)}%</div>
                              <div className="text-green-600 font-medium">S: {parseFloat(item.sgst_rate || 0).toFixed(2)}%</div>
                            </div>
                          ) : (
                            <div className="text-blue-600 font-medium">I: {parseFloat(item.igst_rate || 0).toFixed(2)}%</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-semibold text-gray-900">
                          ₹{parseFloat(item.total_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-3 py-12 text-center">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <div className="text-base text-gray-500 font-medium mb-1">No items added yet</div>
                        <div className="text-sm text-gray-400">Search for items above to start</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Notes Section */}
            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                <textarea
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Terms and conditions..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;