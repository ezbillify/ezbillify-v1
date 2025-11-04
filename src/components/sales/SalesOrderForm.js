// src/components/sales/SalesOrderForm.js
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
  Send, 
  Calculator, 
  Users,
  FileText,
  Search,
  Trash2,
  Loader2,
  Package,
  FileCheck
} from 'lucide-react';

const SalesOrderForm = ({ salesOrderId, companyId, quotationId }) => {
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

  const getDeliveryDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 7); // 7 days from today
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [salesOrderNumber, setSalesOrderNumber] = useState('Select Branch...');
  const [formData, setFormData] = useState({
    customer_id: '',
    parent_document_id: quotationId || null,
    document_date: getTodayDate(),
    due_date: getDeliveryDate(),  // Changed from delivery_date to due_date
    notes: '',
    terms_conditions: '',
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
  const [salesOrderBranch, setSalesOrderBranch] = useState(null);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeForm = async () => {
      if (initializationRef.current) {
        console.log('⏭️ Skipping duplicate initialization');
        return;
      }
      
      console.log('🚀 Starting sales order form initialization...');
      initializationRef.current = true;

      try {
        if (!salesOrderId && isMounted) {
          setSalesOrderNumber('Select Branch...');
        }

        if (companyId && isMounted) {
          console.log('📊 Fetching master data...');
          
          await Promise.all([
            fetchCustomerData(companyId), // Fetch all active customers
            fetchItems(),
            fetchUnits(),
            fetchTaxRates()
          ]);
          
          console.log('✅ Master data loaded');
        }
        
        if (salesOrderId && isMounted) {
          console.log('📝 Loading existing sales order...');
          await fetchSalesOrder();
        } else if (quotationId && isMounted) {
          console.log('📦 Loading quotation data...');
          await loadQuotation();
        }

        console.log('✅ Form initialization complete');
      } catch (error) {
        console.error('❌ Error during form initialization:', error);
        if (isMounted && !salesOrderId) {
          setSalesOrderNumber('SO-0001/25-26');
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
    if (salesOrderId && initializationRef.current) {
      console.log('📝 Sales Order ID changed, reloading data...');
      fetchSalesOrder();
    }
  }, [salesOrderId]);

  useEffect(() => {
    if (quotationId && !salesOrderId && initializationRef.current) {
      console.log('📦 Quotation ID changed, reloading data...');
      loadQuotation();
    }
  }, [quotationId]);

  useEffect(() => {
    if (!salesOrderId && selectedBranch?.id && initializationRef.current && companyId) {
      console.log('🏢 Branch changed, updating sales order number preview...');
      setSalesOrderNumber('Loading...');
      fetchNextSalesOrderNumber();
    }
  }, [selectedBranch?.id]);

  useEffect(() => {
    if (selectedCustomer && company?.address?.state) {
      const customerState = selectedCustomer.billing_address?.state;
      const companyState = company.address.state;
      
      if (customerState && companyState) {
        const gstType = getGSTType(companyState, customerState);
        setFormData(prev => ({ ...prev, gst_type: gstType }));
        updateItemsWithGSTType(gstType);
      }
    }
  }, [selectedCustomer, company?.address?.state]);

  const updateItemsWithGSTType = (gstType) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        const taxRate = item.tax_rate || 0;
        
        let cgstRate = 0, sgstRate = 0, igstRate = 0;
        
        if (gstType === 'intrastate') {
          cgstRate = taxRate / 2;
          sgstRate = taxRate / 2;
          igstRate = 0;
        } else {
          cgstRate = 0;
          sgstRate = 0;
          igstRate = taxRate;
        }
        
        return {
          ...item,
          cgst_rate: cgstRate,
          sgst_rate: sgstRate,
          igst_rate: igstRate,
          cgst_amount: (item.taxable_amount * cgstRate) / 100,
          sgst_amount: (item.taxable_amount * sgstRate) / 100,
          igst_amount: (item.taxable_amount * igstRate) / 100,
          total_amount: item.taxable_amount + 
            (item.taxable_amount * cgstRate) / 100 +
            (item.taxable_amount * sgstRate) / 100 +
            (item.taxable_amount * igstRate) / 100
        };
      });
    });
  };

  const fetchNextSalesOrderNumber = async () => {
    console.log('👁️ Fetching sales order number PREVIEW (will NOT increment database)...');
    
    // Build URL with company_id and optional branch_id
    let url = `/api/settings/document-numbering?company_id=${companyId}&document_type=sales_order&action=preview`;
    
    if (selectedBranch?.id) {
      url += `&branch_id=${selectedBranch.id}`;
      console.log('🏢 Using branch for sales order number:', selectedBranch.name || selectedBranch.branch_name);
    }
    
    const apiCall = async () => {
      return await authenticatedFetch(url);
    };

    const result = await executeRequest(apiCall);
    console.log('📊 Preview API Result:', result);
    
    if (result.success && result.data?.preview) {
      console.log('✅ Setting sales order number to:', result.data.preview);
      setSalesOrderNumber(result.data.preview);
    } else {
      console.warn('⚠️ No preview data received, using fallback');
      setSalesOrderNumber('SO-0001/25-26');
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

  const fetchItems = async () => {
    try {
      // Fetch items with all necessary fields for sales forms
      const response = await authenticatedFetch(`/api/items?company_id=${companyId}&limit=1000&is_active=true&is_for_sale=true`);
      if (response.success) {
        // Ensure items have all required fields for sales
        const processedItems = (response.data || []).map(item => ({
          ...item,
          // Use selling price with tax, fallback to other prices if needed
          effective_selling_price: item.selling_price_with_tax || item.selling_price || item.purchase_price || 0,
          // Ensure we have proper tax information
          effective_tax_rate: item.tax_rate_id ? 
            taxRates.find(tr => tr.id === item.tax_rate_id)?.tax_rate || 0 : 0
        }));
        setAvailableItems(processedItems);
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
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const fetchTaxRates = async () => {
    try {
      const response = await authenticatedFetch(`/api/master-data/tax-rates?company_id=${companyId}`);
      if (response.success) {
        setTaxRates(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching tax rates:', error);
    }
  };

  const fetchSalesOrder = async () => {
    try {
      const response = await authenticatedFetch(`/api/sales/sales-orders/${salesOrderId}?company_id=${companyId}`);
      
      if (response.success && response.data) {
        const salesOrder = response.data;
        
        setFormData({
          customer_id: salesOrder.customer_id,
          parent_document_id: salesOrder.parent_document_id,
          document_date: salesOrder.document_date,
          due_date: salesOrder.due_date,  // Changed from delivery_date to due_date
          notes: salesOrder.notes || '',
          terms_conditions: salesOrder.terms_conditions || '',
          discount_percentage: salesOrder.discount_percentage || 0,
          discount_amount: salesOrder.discount_amount || 0,
          gst_type: salesOrder.gst_type
        });

        setSalesOrderNumber(salesOrder.document_number);
        
        if (salesOrder.customer) {
          setSelectedCustomer(salesOrder.customer);
          setCustomerSearch(salesOrder.customer.name);
        }

        if (salesOrder.branch) {
          setSalesOrderBranch(salesOrder.branch);
        }

        if (salesOrder.items && salesOrder.items.length > 0) {
          const formattedItems = salesOrder.items.map(item => ({
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
            selling_price: item.selling_price || item.item?.selling_price || null
          }));
          setItems(formattedItems);
        }
      }
    } catch (error) {
      console.error('Error fetching sales order:', error);
      showError('Failed to load sales order');
    }
  };

  const loadQuotation = async () => {
    try {
      const response = await authenticatedFetch(`/api/sales/quotations/${quotationId}?company_id=${companyId}`);
      
      if (response.success && response.data) {
        const quotation = response.data;
        
        setFormData(prev => ({
          ...prev,
          customer_id: quotation.customer_id,
          parent_document_id: quotationId,
          document_date: getTodayDate(),
          due_date: getDeliveryDate(),  // Changed from delivery_date to due_date
          notes: quotation.notes || '',
          terms_conditions: quotation.terms_conditions || '',
          discount_percentage: quotation.discount_percentage || 0,
          discount_amount: quotation.discount_amount || 0
        }));

        if (quotation.customer) {
          setSelectedCustomer(quotation.customer);
          setCustomerSearch(quotation.customer.name);
        }

        if (quotation.items && quotation.items.length > 0) {
          const formattedItems = quotation.items.map(item => ({
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
            selling_price: item.selling_price || item.item?.selling_price || null
          }));
          setItems(formattedItems);
        }
      }
    } catch (error) {
      console.error('Error loading quotation:', error);
      showError('Failed to load quotation data');
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

  const filteredItems = availableItems.filter(item =>
    item.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.item_code.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.customer_type === 'b2b' ? (customer.company_name || customer.name) : customer.name);
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setShowCustomerDropdown(false);
  };

  const handleItemSelect = (item) => {
    const unit = units.find(u => u.id === item.primary_unit_id);
    
    // Check if item already exists in the list
    const existingItemIndex = items.findIndex(i => i.item_id === item.id);
    
    if (existingItemIndex !== -1) {
      // If item exists, increase quantity by 1
      const updatedItems = [...items];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + 1
      };
      
      // Recalculate amounts for the updated item
      const recalculatedItems = calculateLineAmounts(updatedItems, existingItemIndex);
      setItems(recalculatedItems);
    } else {
      // If item doesn't exist, add as new item
      // Get tax information for the item
      let taxInfo = {
        tax_rate: 0,
        cgst_rate: 0,
        sgst_rate: 0,
        igst_rate: 0
      };

      // Try to get tax rate from item's tax_rate_id first, then fallback to gst_rate
      const taxRateId = item.tax_rate_id;
      const taxRateValue = item.gst_rate || 0;
      
      if (taxRateId && taxRates.length > 0) {
        const taxRate = taxRates.find(t => t.id === taxRateId);
        if (taxRate) {
          const gstType = formData.gst_type || 'intrastate';
          
          if (gstType === 'intrastate') {
            taxInfo = {
              tax_rate: taxRate.tax_rate,
              cgst_rate: taxRate.tax_rate / 2,
              sgst_rate: taxRate.tax_rate / 2,
              igst_rate: 0
            };
          } else {
            taxInfo = {
              tax_rate: taxRate.tax_rate,
              cgst_rate: 0,
              sgst_rate: 0,
              igst_rate: taxRate.tax_rate
            };
          }
        }
      } else if (taxRateValue > 0) {
        // Fallback to gst_rate if tax_rate_id is not available
        const gstType = formData.gst_type || 'intrastate';
        
        if (gstType === 'intrastate') {
          taxInfo = {
            tax_rate: taxRateValue,
            cgst_rate: taxRateValue / 2,
            sgst_rate: taxRateValue / 2,
            igst_rate: 0
          };
        } else {
          taxInfo = {
            tax_rate: taxRateValue,
            cgst_rate: 0,
            sgst_rate: 0,
            igst_rate: taxRateValue
          };
        }
      }

      // Rate includes tax - calculate backwards to get taxable amount
      const rateWithTax = item.effective_selling_price || item.selling_price_with_tax || item.selling_price || item.purchase_price || 0;
      const taxRate = taxInfo.tax_rate || 0;

      // Calculate taxable amount (reverse calculation)
      const taxableAmount = taxRate > 0 ? rateWithTax / (1 + taxRate / 100) : rateWithTax;

      const newItem = {
        id: Date.now() + Math.random(), // Unique ID for the line item
        item_id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || '',
        rate: rateWithTax,
        quantity: 1,
        unit_id: item.primary_unit_id,
        unit_name: unit?.unit_name || item.primary_unit?.unit_name || '',
        hsn_sac_code: item.hsn_sac_code || '',
        discount_percentage: 0,
        discount_amount: 0,
        taxable_amount: taxableAmount,
        tax_rate: taxInfo.tax_rate,
        cgst_rate: taxInfo.cgst_rate,
        sgst_rate: taxInfo.sgst_rate,
        igst_rate: taxInfo.igst_rate,
        cgst_amount: (taxableAmount * taxInfo.cgst_rate) / 100,
        sgst_amount: (taxableAmount * taxInfo.sgst_rate) / 100,
        igst_amount: (taxableAmount * taxInfo.igst_rate) / 100,
        total_amount: rateWithTax,
        mrp: item.mrp || null,
        selling_price: item.selling_price || null
      };

      setItems(prevItems => [...prevItems, newItem]);
      
      // Recalculate all item amounts
      recalculateItemAmounts([...items, newItem]);
    }
    
    setItemSearch('');
    setShowItemDropdown(false);
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      const parsedValue = ['quantity', 'rate', 'discount_percentage'].includes(field) 
        ? parseFloat(value) || 0 
        : value;
      
      newItems[index] = { ...newItems[index], [field]: parsedValue };
      return calculateLineAmounts(newItems, index);
    });
  };

  const calculateLineAmounts = (items, index) => {
    const item = items[index];
    const quantity = parseFloat(item.quantity) || 0;
    const rateWithTax = parseFloat(item.rate) || 0;
    const discountPercentage = parseFloat(item.discount_percentage) || 0;
    const taxRate = parseFloat(item.tax_rate) || 0;

    // Calculate line amount with tax
    const lineAmountWithTax = quantity * rateWithTax;

    // Apply discount on the line amount (with tax)
    const discountAmount = (lineAmountWithTax * discountPercentage) / 100;
    const lineAmountAfterDiscount = lineAmountWithTax - discountAmount;

    // Reverse calculate to get taxable amount (base amount without tax)
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
      taxable_amount: taxableAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      total_amount: lineAmountAfterDiscount
    };

    return items;
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const recalculateItemAmounts = (itemsToRecalculate) => {
    let updatedItems = [...itemsToRecalculate];

    // Recalculate each item's amounts
    updatedItems = updatedItems.map((item, index) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rateWithTax = parseFloat(item.rate) || 0;
      const discountPercentage = parseFloat(item.discount_percentage) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;

      // Calculate line amount with tax
      const lineAmountWithTax = quantity * rateWithTax;

      // Apply discount on the line amount (with tax)
      const discountAmount = (lineAmountWithTax * discountPercentage) / 100;
      const lineAmountAfterDiscount = lineAmountWithTax - discountAmount;

      // Reverse calculate to get taxable amount (base amount without tax)
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
        taxable_amount: taxableAmount,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        total_amount: lineAmountAfterDiscount
      };
    });

    setItems(updatedItems);
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
    console.log('🔍 Validating form data:', formData);
    console.log('👥 Available customers:', customers);
    console.log('👤 Selected customer ID:', formData.customer_id);
    
    // Check if the selected customer exists in our customer list
    const customerExists = customers.some(customer => customer.id === formData.customer_id);
    console.log('✅ Customer exists in list:', customerExists);
    
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

    // Check if customer exists in our fetched list
    if (!customerExists) {
      showError('Selected customer not found in company records. Please select a valid customer.');
      // Refresh customer data and try again
      try {
        console.log('🔄 Refreshing customer data...');
        const result = await fetchCustomerData(companyId);
        // Update local customers state with fresh data
        if (result.success) {
          setCustomers(result.data || []);
          const refreshedCustomerExists = (result.data || []).some(customer => customer.id === formData.customer_id);
          if (!refreshedCustomerExists) {
            console.log('❌ Customer still not found after refresh');
            return false;
          }
          console.log('✅ Customer found after refresh');
        } else {
          console.log('❌ Failed to refresh customer data');
          return false;
        }
      } catch (err) {
        console.error('❌ Error refreshing customer data:', err);
        return false;
      }
    }
    
    // Additional check: Verify customer belongs to current company
    const selectedCustomerData = customers.find(c => c.id === formData.customer_id);
    if (selectedCustomerData && companyId && selectedCustomerData.company_id !== companyId) {
      console.warn('⚠️ Customer company mismatch detected:', {
        customerId: formData.customer_id,
        customerCompanyId: selectedCustomerData.company_id,
        currentCompanyId: companyId
      });
      showError('Selected customer does not belong to the current company. Please select a different customer.');
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

    // Log items for debugging
    console.log('📋 Items to save:', items);

    // Validate that all items have required fields
    const incompleteItems = items.filter(item => 
      !item.item_id || 
      !item.unit_id || 
      item.quantity === undefined || 
      item.rate === undefined
    );
    
    if (incompleteItems.length > 0) {
      showError('Some items are missing required information. Please check all items.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm())) return;

    const apiCall = async () => {
      const url = salesOrderId ? `/api/sales/sales-orders/${salesOrderId}` : '/api/sales/sales-orders';
      const method = salesOrderId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        company_id: companyId,
        items
      };

      if (!salesOrderId && selectedBranch?.id) {
        payload.branch_id = selectedBranch.id;
        console.log('🏢 Saving sales order with branch:', selectedBranch.name || selectedBranch.branch_name);
      }

      // Log payload for debugging
      console.log('📤 Sales order payload:', JSON.stringify(payload, null, 2));
      
      // Additional validation before sending
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
      showSuccess(`Sales order ${salesOrderId ? 'updated' : 'created'} successfully!`);
      setTimeout(() => {
        router.push('/sales/sales-orders');
      }, 1500);
    } else {
      console.error('Sales order save failed:', result);
      showError(result.error || result.message || 'Failed to save sales order. Please try again.');
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <style jsx>{`
        /* Hide spinners for number inputs */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
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
                  {salesOrderId ? 'Edit Sales Order' : 'Create Sales Order'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div>
                    <h1 className="text-sm font-semibold text-gray-900">
                      Sales Order Number: <span className={salesOrderNumber === 'Select Branch...' || salesOrderNumber === 'Loading...' ? 'text-gray-400' : 'text-blue-600'}>#{salesOrderNumber}</span>
                    </h1>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {salesOrderId && salesOrderBranch ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-sm font-medium text-blue-900">
                          Branch: {salesOrderBranch.name || salesOrderBranch.branch_name}
                        </span>
                      </div>
                    ) : !salesOrderId && selectedBranch ? (
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
              <button className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium border border-orange-200">
                <FileCheck className="w-4 h-4" />
                Convert to Invoice
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              
              <button 
                onClick={handleSubmit}
                disabled={loading || !formData.customer_id || items.length === 0}
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
        {/* Top Row - Customer, Sales Order Details, Summary */}
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
                    <div className="font-medium text-gray-900 mb-0.5">
                      {selectedCustomer.customer_type === 'b2b' && selectedCustomer.company_name 
                        ? selectedCustomer.company_name 
                        : selectedCustomer.name}
                    </div>
                    {selectedCustomer.customer_type === 'b2b' && selectedCustomer.company_name && (
                      <div className="text-xs text-gray-700 font-medium mb-0.5">Contact: {selectedCustomer.name}</div>
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

                  {formData.gst_type && (
                    <div className={`text-xs p-2.5 rounded-lg border ${
                      formData.gst_type === 'intrastate'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className={`font-semibold mb-0.5 ${
                        formData.gst_type === 'intrastate' ? 'text-green-800' : 'text-blue-800'
                      }`}>
                        {formData.gst_type === 'intrastate' ? 'Same State - Intrastate' : 'Different State - Interstate'}
                      </div>
                      <div className={`text-xs ${
                        formData.gst_type === 'intrastate' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {formData.gst_type === 'intrastate' ? 'CGST + SGST will apply' : 'IGST will apply'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sales Order Details Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Sales Order Details</h3>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Order Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={formData.document_date}
                      onChange={(date) => setFormData(prev => ({ ...prev, document_date: date }))}
                      required
                      className="custom-datepicker"
                    />
                  </div>
                  
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Delivery Date
                    </label>
                    <DatePicker
                      value={formData.due_date}  // Changed from delivery_date to due_date
                      onChange={(date) => setFormData(prev => ({ ...prev, due_date: date }))}  // Changed from delivery_date to due_date
                      className="custom-datepicker"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Sales Order Summary Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Order Summary</h3>
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
              {/* Discount Section */}
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

              {/* Totals */}
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
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search items... (F2)"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowItemDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && itemSearch) {
                      const filtered = filteredItems.filter(i => 
                        i.item_name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                        i.item_code.toLowerCase().includes(itemSearch.toLowerCase())
                      );
                      if (filtered.length > 0) {
                        handleItemSelect(filtered[0]);
                      }
                    }
                  }}
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
                        <div className="flex justify-between items-center mt-2">
                          {item.mrp && (
                            <span className="text-xs text-gray-500 line-through">MRP: ₹{item.mrp.toFixed(2)}</span>
                          )}
                          <div className="flex gap-3">
                            {item.purchase_price && (
                              <span className="text-xs text-blue-600 font-medium">P.P: ₹{item.purchase_price.toFixed(2)}</span>
                            )}
                            <span className="text-xs text-green-600 font-medium">SP: ₹{(item.selling_price_with_tax || item.selling_price || item.purchase_price || 0).toFixed(2)} (incl. tax)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-10">#</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase">Item Name</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">MRP</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">P.P</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">Qty</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-16">Unit</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-24">Rate</th>
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
                        <td className="px-3 py-2 text-center">
                          {item.mrp ? (
                            <div className="text-gray-500 font-medium text-sm">₹{item.mrp.toFixed(2)}</div>
                          ) : (
                            <div className="text-gray-500">-</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.purchase_price ? (
                            <div className="text-blue-600 font-medium text-sm">₹{item.purchase_price.toFixed(2)}</div>
                          ) : (
                            <div className="text-gray-500">-</div>
                          )}
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
                              <div className="text-green-600 font-medium">C: {item.cgst_rate}%</div>
                              <div className="text-green-600 font-medium">S: {item.sgst_rate}%</div>
                            </div>
                          ) : (
                            <div className="text-blue-600 font-medium">I: {item.igst_rate}%</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-semibold text-gray-900">
                          ₹{item.total_amount.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
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
                        <div className="text-sm text-gray-400">Search for items above or press F2 to start adding items</div>
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
                  placeholder="Additional notes for this sales order..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                <textarea
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Terms and conditions for this sales order..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesOrderForm;
