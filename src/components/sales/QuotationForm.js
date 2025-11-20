// src/components/sales/QuotationForm.js - OPTIMIZED MATCHING INVOICEFORM
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
  Phone,
  MapPin,
  Mail,
  ChevronDown,
  ChevronUp,
  PercentSquare,
  AlertCircle,
  TrendingDown
} from 'lucide-react';

const QuotationForm = ({ quotationId, companyId }) => {
  const router = useRouter();
  const { company } = useAuth();
  const { branches, selectedBranch, selectBranch } = useBranch();
  const { success: showSuccess, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();
  const { fetchCustomers: fetchCustomerData, customers: fetchedCustomers } = useCustomers();

  const initializationRef = useRef(false);
  const [expandedCustomer, setExpandedCustomer] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getValidUntilDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 30);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [quotationNumber, setQuotationNumber] = useState('Select Branch...');
  const [formData, setFormData] = useState({
    customer_id: '',
    document_date: getTodayDate(),
    valid_until: getValidUntilDate(),
    reference_number: '',
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
  const [quotationBranch, setQuotationBranch] = useState(null);

  // Add state for scanner visibility
  const [showScanner, setShowScanner] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // ✅ Helper function to get tax information for an item
  const getTaxInfoForItem = (item, gstType) => {
    let taxInfo = {
      tax_rate: 0,
      cgst_rate: 0,
      sgst_rate: 0,
      igst_rate: 0
    };

    if (item.tax_rate_id && taxRates.length > 0) {
      const foundTaxRate = taxRates.find(t => t.id === item.tax_rate_id);
      if (foundTaxRate && foundTaxRate.tax_rate > 0) {
        const rate = parseFloat(foundTaxRate.tax_rate || 0);
        
        if (gstType === 'intrastate') {
          taxInfo = {
            tax_rate: rate,
            cgst_rate: rate / 2,
            sgst_rate: rate / 2,
            igst_rate: 0
          };
        } else {
          taxInfo = {
            tax_rate: rate,
            cgst_rate: 0,
            sgst_rate: 0,
            igst_rate: rate
          };
        }
        return taxInfo;
      }
    }

    const taxRateValue = parseFloat(item.gst_rate || 0);
    if (taxRateValue > 0) {
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

    return taxInfo;
  };

  useEffect(() => {
    let isMounted = true;

    const initializeForm = async () => {
      // Reset initialization ref when creating a new quotation
      if (!quotationId) {
        initializationRef.current = false;
      }
      
      if (initializationRef.current) return;
      
      initializationRef.current = true;

      try {
        if (!quotationId && isMounted) {
          setQuotationNumber('Select Branch...');
        }

        if (companyId && isMounted) {
          const startTime = performance.now();
          
          await Promise.all([
            fetchCustomerData(companyId),
            fetchItems(),
            fetchUnits(),
            fetchTaxRates()
          ]);
          
          const endTime = performance.now();
          console.log(`✅ Master data loaded in ${(endTime - startTime).toFixed(0)}ms`);
        }
        
        if (quotationId && isMounted) {
          await fetchQuotation();
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        if (isMounted && !quotationId) {
          setQuotationNumber('QUO-0001/25-26');
        }
      }
    };

    initializeForm();

    return () => {
      isMounted = false;
    };
  }, [companyId, quotationId]);

  useEffect(() => {
    setCustomers(fetchedCustomers);
  }, [fetchedCustomers]);

  useEffect(() => {
    if (quotationId && initializationRef.current) {
      fetchQuotation();
    }
  }, [quotationId]);

  useEffect(() => {
    if (!quotationId && selectedBranch?.id && companyId) {
      setQuotationNumber('Loading...');
      fetchNextQuotationNumber();
    }
  }, [selectedBranch?.id, quotationId]);

  // ✅ FIXED: Set GST type when customer is selected
  useEffect(() => {
    if (selectedCustomer && company?.address?.state && selectedCustomer.billing_address?.state) {
      const gstType = getGSTType(company.address.state, selectedCustomer.billing_address.state);
      setFormData(prev => ({ ...prev, gst_type: gstType }));
      updateItemsWithGSTType(gstType);
    }
  }, [selectedCustomer, company?.address?.state]);

  // ✅ FIXED: Update tax rates based on GST type
  const updateItemsWithGSTType = (gstType) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.tax_rate > 0) {
          const taxInfo = getTaxInfoForItem({ ...item, gst_rate: item.tax_rate }, gstType);
          
          const cgstAmount = (item.taxable_amount * taxInfo.cgst_rate) / 100;
          const sgstAmount = (item.taxable_amount * taxInfo.sgst_rate) / 100;
          const igstAmount = (item.taxable_amount * taxInfo.igst_rate) / 100;
          const totalTax = cgstAmount + sgstAmount + igstAmount;
          
          return {
            ...item,
            cgst_rate: taxInfo.cgst_rate,
            sgst_rate: taxInfo.sgst_rate,
            igst_rate: taxInfo.igst_rate,
            cgst_amount: cgstAmount,
            sgst_amount: sgstAmount,
            igst_amount: igstAmount,
            total_amount: item.taxable_amount + totalTax
          };
        }
        return item;
      });
    });
  };

  const fetchNextQuotationNumber = async () => {
    let url = `/api/settings/document-numbering?company_id=${companyId}&document_type=quotation&action=preview`;
    
    if (selectedBranch?.id) {
      url += `&branch_id=${selectedBranch.id}`;
    }
    
    const apiCall = async () => {
      return await authenticatedFetch(url);
    };

    const result = await executeRequest(apiCall);
    
    if (result.success && result.data?.preview) {
      setQuotationNumber(result.data.preview);
    } else {
      setQuotationNumber('QUO-0001/25-26');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await authenticatedFetch(`/api/items?company_id=${companyId}&limit=1000&is_active=true&is_for_sale=true`);
      if (response.success) {
        const processedItems = (response.data || []).map(item => ({
          ...item,
          effective_selling_price: item.selling_price_with_tax || item.selling_price || item.purchase_price || 0
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

  const fetchQuotation = async () => {
    try {
      const response = await authenticatedFetch(`/api/sales/quotations/${quotationId}?company_id=${companyId}`);
      
      if (response.success && response.data) {
        const quotation = response.data;
        
        setFormData({
          customer_id: quotation.customer_id,
          document_date: quotation.document_date,
          valid_until: quotation.valid_until,
          reference_number: quotation.reference_number,
          notes: quotation.notes || '',
          terms_conditions: quotation.terms_conditions || '',
          discount_percentage: quotation.discount_percentage || 0,
          discount_amount: quotation.discount_amount || 0,
          gst_type: quotation.gst_type
        });

        setQuotationNumber(quotation.document_number);
        
        if (quotation.customer) {
          setSelectedCustomer(quotation.customer);
          setCustomerSearch(quotation.customer.name);
        }

        if (quotation.branch) {
          setQuotationBranch(quotation.branch);
        }

        if (quotation.items && quotation.items.length > 0) {
          const formattedItems = quotation.items.map(item => ({
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
      console.error('Error fetching quotation:', error);
      showError('Failed to load quotation');
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
    
    if (companyId && customer.company_id && customer.company_id !== companyId) {
      showError('Selected customer belongs to a different company.');
    }
    
    setShowCustomerDropdown(false);
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
            console.log('✅ Adding fetched item to quotation');
            handleItemSelect(itemResult.data, true); // true = from barcode
          } else {
            console.error('❌ Failed to load item details:', itemResult);
            // Don't show error for barcode scans to avoid toast notifications
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
      setItemSearch('');
    }
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
    }

    setItemSearch('');
    setShowItemDropdown(false);
  };

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

    updatedItems = updatedItems.map((item) => {
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

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!(await validateForm())) return;

    const apiCall = async () => {
      const url = quotationId ? `/api/sales/quotations/${quotationId}` : '/api/sales/quotations';
      const method = quotationId ? 'PUT' : 'POST';

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
          selling_price: item.selling_price
        }))
      };

      if (!quotationId && selectedBranch?.id) {
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
      showSuccess(`Quotation ${quotationId ? 'updated' : 'created'} successfully!`);
      
      setTimeout(() => {
        // Reset initialization ref to allow proper re-initialization for next new quotation
        initializationRef.current = false;
        // With real-time updates, we don't need to manually trigger refresh
        router.push(`/sales/quotations`);
      }, 500);
    } else {
      showError(result.error || 'Failed to save quotation.');
    }
  };

  // Add scanner handler
  const handleScanBarcode = () => {
    setShowScanner(true);
  };

  // Handle successful scan
  const handleScanSuccess = (result) => {
    console.log('Scan successful:', result);
    // Here you would typically add the scanned item to the quotation
    // For now, we'll just close the scanner
    setShowScanner(false);
  };

  // Handle scan error
  const handleScanError = (error) => {
    console.error('Scan error:', error);
    showError('Failed to scan barcode: ' + error);
    setShowScanner(false);
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Scan Barcode</h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-pulse mb-3">
                    <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M5 8h2a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1zm12 0h2a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v3a1 1 0 001 1zM5 20h2a1 1 0 001-1v-3a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Point camera at barcode</p>
                  <p className="text-sm text-gray-500 mt-1">Scanning will start automatically</p>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setShowScanner(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel Scan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  {quotationId ? 'Edit Quotation' : 'Create Quotation'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <h1 className="text-sm font-semibold text-gray-900">
                    Quotation Number: <span className={quotationNumber === 'Select Branch...' || quotationNumber === 'Loading...' ? 'text-gray-400' : 'text-blue-600'}>#{quotationNumber}</span>
                  </h1>
                  
                  {quotationId && quotationBranch ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-sm font-medium text-blue-900">
                        {quotationBranch.name || quotationBranch.branch_name}
                      </span>
                    </div>
                  ) : !quotationId && selectedBranch ? (
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
                disabled={loading || !formData.customer_id || items.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? 'Saving...' : 'Save'}
              </button>
              
              <button className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
                <Printer className="w-4 h-4" />
                Print
              </button>
              
              <button className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors">
                <Send className="w-4 h-4" />
                Send
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
                        {/* Header: Company/Name + Badge */}
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

                        {/* Contact Info Row */}
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

                        {/* ✅ Address Row */}
                        {customer.billing_address && (
                          <div className="flex items-start gap-2 mb-2 bg-gray-50 px-2 py-1.5 rounded border border-gray-100">
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
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quotation Details Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Quotation Details</h3>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Quotation Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      value={formData.document_date}
                      onChange={(date) => setFormData(prev => ({ ...prev, document_date: date }))}
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Valid Until
                    </label>
                    <DatePicker
                      value={formData.valid_until}
                      onChange={(date) => setFormData(prev => ({ ...prev, valid_until: date }))}
                    />
                  </div>
                </div>
                
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleScanBarcode}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="font-medium">SCAN BARCODE</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quotation Summary Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Quotation Summary</h3>
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
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search items... (scan barcode automatically)"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowItemDropdown(true);
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
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600 font-medium">SP: ₹{(item.selling_price_with_tax || item.selling_price || 0).toFixed(2)} (incl. tax)</span>
                            {item.mrp && (
                              <span className="text-slate-600 font-medium">MRP: ₹{(item.mrp).toFixed(2)}</span>
                            )}
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
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">Qty</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-16">Unit</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">Rate</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-700 uppercase w-20">MRP</th>
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
                      <td colSpan={10} className="px-3 py-12 text-center">
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

export default QuotationForm;