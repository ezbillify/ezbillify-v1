// src/services/printService.js
import pdfGenerationService from './pdfGenerationService';
import QRCode from 'qrcode';

class PrintService {
  constructor() {
    this.templateCache = new Map();
  }

  /**
   * Clear template cache - useful when templates are updated
   */
  clearCache() {
    console.log('🗑️ Clearing template cache');
    this.templateCache.clear();
  }

  /**
   * Get template for document type and paper size
   */
  async getTemplate(documentType, paperSize, companyId) {
    try {
      const cacheKey = `${documentType}-${paperSize}-${companyId}`;
      if (this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey);
      }

      const response = await fetch(`/api/settings/print-templates?company_id=${companyId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const template = result.data.find(t => 
          t.document_type === documentType && 
          t.paper_size === (paperSize || 'A4')
        );
        
        if (template) {
          this.templateCache.set(cacheKey, template);
          return template;
        }
      }

      return this.getDefaultTemplate(documentType, paperSize);
    } catch (error) {
      console.error('Error fetching template:', error);
      return this.getDefaultTemplate(documentType, paperSize);
    }
  }

  /**
   * Get default template for thermal receipt (80mm)
   */
  getDefaultTemplate(documentType, paperSize) {
    throw new Error(`No template found for ${documentType} with paper size ${paperSize}. Templates should be loaded from external files.`);
  }

  /**
   * Generate UPI QR code for payment
   */
  async generateUPIQRCode(documentData) {
    try {
      if (!documentData.bank_account?.upi_id) {
        return '';
      }

      const upiId = documentData.bank_account.upi_id;
      const amount = documentData.total_amount;
      const note = `Payment for Invoice ${documentData.document_number}`;
      const customerName = documentData.customer?.name || documentData.customer_name || '';

      let upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}`;
      
      if (customerName) {
        upiUrl += `&pn=${encodeURIComponent(customerName)}`;
      }
      
      if (amount) {
        upiUrl += `&am=${encodeURIComponent(amount)}`;
      }
      
      upiUrl += '&cu=INR';
      
      if (note) {
        upiUrl += `&tn=${encodeURIComponent(note)}`;
      }

      const qrCodeDataUrl = await QRCode.toDataURL(upiUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating UPI QR code:', error);
      return '';
    }
  }

  /**
   * Generate items table HTML - mapped to schema
   */
  generateItemsTable(items, paperSize, documentData, templateName = '') {
    const formatAmount = (amount) => {
      if (amount === null || amount === undefined) return '0.00';
      if (typeof amount === 'string') return parseFloat(amount || 0).toFixed(2);
      return (parseFloat(amount) || 0).toFixed(2);
    };

    // Check if this is explicitly for 80mm thermal receipt
    // Only use 80mm format if paperSize is exactly '80mm' OR template explicitly requests it
    const is80mm = (paperSize === '80mm' || documentData?.template_type === '80mm');

    // 80mm layout: Professional table with 4 columns
    if (is80mm) {
      // Check if this is the minimal 80mm-noCB template
      // Template name pattern: "Invoice - No Company Branding" or "Sales Order - No Company Branding"
      const isMinimalTemplate = templateName.toLowerCase().includes('no company branding') ||
                                templateName.includes('80mm-noCB') ||
                                templateName.includes('80mm-nocb');
      console.log('🔍 Generating 80mm items table:', {
        templateName,
        isMinimalTemplate,
        itemCount: items.length
      });

      return items.map((item, idx) => {
        // Priority: display_name > print_name > item_name
        const name = item.display_name || item.print_name || item.item_name || '';
        const qty = parseFloat(item.quantity || 0);
        const rate = parseFloat(item.rate || item.selling_price || 0);
        const taxable = parseFloat(item.taxable_amount || 0);
        const total = parseFloat(item.total_amount || (qty * rate) || 0);

        // For minimal template (80mm-noCB), only show item name without HSN/tax info
        if (isMinimalTemplate) {
          return `
          <tr>
            <td>
              <div class="item-name-cell">${this.escapeHtml(name)}</div>
            </td>
            <td class="text-center">${qty}</td>
            <td class="text-right">₹${formatAmount(rate)}</td>
            <td class="text-right">₹${formatAmount(total)}</td>
          </tr>
        `;
        }

        // For detailed 80mm templates, include HSN and tax info
        const hsn = item.hsn_sac_code || item.hsn_sac || '';
        const taxInfo = (() => {
          if (item.cgst_amount || item.sgst_amount) {
            const cg = item.cgst_rate ? `${parseFloat(item.cgst_rate).toFixed(2)}%` : '';
            const sg = item.sgst_rate ? `${parseFloat(item.sgst_rate).toFixed(2)}%` : '';
            return `CGST ${cg}, SGST ${sg}`;
          } else if (item.igst_amount) {
            const ig = item.igst_rate ? `${parseFloat(item.igst_rate).toFixed(2)}%` : '';
            return `IGST ${ig}`;
          }
          return '';
        })();

        return `
          <tr>
            <td>
              <div class="item-name-cell">${this.escapeHtml(name)}</div>
              ${hsn ? `<div class="item-hsn">HSN: ${this.escapeHtml(hsn)}</div>` : ''}
              ${taxInfo ? `<div class="item-tax-info">${taxInfo}</div>` : ''}
            </td>
            <td class="text-center">${qty}</td>
            <td class="text-right">₹${formatAmount(rate)}</td>
            <td class="text-right">₹${formatAmount(total)}</td>
          </tr>
        `;
      }).join('');
    }

    // Default A4 GST-compliant format - Ramnath Traders 11-column layout
    return items.map((item, idx) => {
      const name = item.display_name || item.print_name || item.item_name || '';
      const qty = parseFloat(item.quantity || 0);
      const mrp = parseFloat(item.mrp || item.selling_price || 0);
      const rate = parseFloat(item.rate || item.selling_price || 0);
      const hsn = item.hsn_sac_code || item.hsn_sac || '';
      const discountPercentage = parseFloat(item.discount_percentage || 0);

      // Calculate taxable amount
      const baseAmount = qty * rate;
      const discountAmount = (baseAmount * discountPercentage) / 100;
      const taxableAmount = baseAmount - discountAmount;

      // Get tax rates and amounts
      const cgstRate = parseFloat(item.cgst_rate || 0);
      const sgstRate = parseFloat(item.sgst_rate || 0);
      const cgstAmount = parseFloat(item.cgst_amount || 0);
      const sgstAmount = parseFloat(item.sgst_amount || 0);

      const totalAmount = parseFloat(item.total_amount || item.amount || 0);

      // Format CGST and SGST display (rate and amount on separate lines)
      const cgstDisplay = cgstRate > 0 ? `${cgstRate.toFixed(1)}%<br>₹${formatAmount(cgstAmount)}` : '-';
      const sgstDisplay = sgstRate > 0 ? `${sgstRate.toFixed(1)}%<br>₹${formatAmount(sgstAmount)}` : '-';

      return `
        <tr>
          <td class="col-slno">${idx + 1}</td>
          <td class="col-item">${this.escapeHtml(name)}</td>
          <td class="col-mrp">₹${formatAmount(mrp)}</td>
          <td class="col-hsn">${this.escapeHtml(hsn)}</td>
          <td class="col-rate">₹${formatAmount(rate)}</td>
          <td class="col-disc">${discountPercentage > 0 ? discountPercentage.toFixed(1) : '0'}</td>
          <td class="col-qty">${qty}</td>
          <td class="col-taxable">₹${formatAmount(taxableAmount)}</td>
          <td class="col-cgst">${cgstDisplay}</td>
          <td class="col-sgst">${sgstDisplay}</td>
          <td class="col-amount">₹${formatAmount(totalAmount)}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Generate HSN-wise tax breakdown table - Ramnath Traders format
   */
  generateTaxBreakdownTable(items) {
    const formatAmount = (amount) => {
      if (amount === null || amount === undefined) return '0.00';
      if (typeof amount === 'string') return parseFloat(amount || 0).toFixed(2);
      return (parseFloat(amount) || 0).toFixed(2);
    };

    // Group items by HSN/SAC code
    const hsnGroups = {};

    items.forEach(item => {
      const hsn = item.hsn_sac_code || item.hsn_sac || 'N/A';
      const cgstRate = parseFloat(item.cgst_rate || 0);
      const sgstRate = parseFloat(item.sgst_rate || 0);

      if (!hsnGroups[hsn]) {
        hsnGroups[hsn] = {
          hsn: hsn,
          taxableValue: 0,
          cgstRate: cgstRate,
          sgstRate: sgstRate,
          cgstAmount: 0,
          sgstAmount: 0
        };
      }

      // Calculate taxable amount for this item
      const qty = parseFloat(item.quantity || 0);
      const rate = parseFloat(item.rate || item.selling_price || 0);
      const discountPercentage = parseFloat(item.discount_percentage || 0);
      const baseAmount = qty * rate;
      const discountAmount = (baseAmount * discountPercentage) / 100;
      const taxableValue = baseAmount - discountAmount;

      const cgstAmount = parseFloat(item.cgst_amount || 0);
      const sgstAmount = parseFloat(item.sgst_amount || 0);

      hsnGroups[hsn].taxableValue += taxableValue;
      hsnGroups[hsn].cgstAmount += cgstAmount;
      hsnGroups[hsn].sgstAmount += sgstAmount;
    });

    // Generate table rows (7 columns: HSN/SAC, TAXABLE AMOUNT, CENTRAL TAX RATE, CENTRAL TAX AMOUNT, STATE TAX RATE, STATE TAX AMOUNT, TOTAL TAX AMOUNT)
    return Object.values(hsnGroups).map(group => {
      const totalTaxAmount = group.cgstAmount + group.sgstAmount;
      return `
        <tr>
          <td>${this.escapeHtml(group.hsn)}</td>
          <td class="text-right">₹${formatAmount(group.taxableValue)}</td>
          <td>${group.cgstRate > 0 ? group.cgstRate.toFixed(1) + '%' : '0%'}</td>
          <td class="text-right">₹${formatAmount(group.cgstAmount)}</td>
          <td>${group.sgstRate > 0 ? group.sgstRate.toFixed(1) + '%' : '0%'}</td>
          <td class="text-right">₹${formatAmount(group.sgstAmount)}</td>
          <td class="text-right">₹${formatAmount(totalTaxAmount)}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Format address from JSONB
   */
  formatAddressLines(addressObj) {
    if (!addressObj) return { line1: '', line2: '', city: '', state: '', postal_code: '' };

    if (typeof addressObj === 'string') {
      return { line1: addressObj, line2: '', city: '', state: '', postal_code: '' };
    }

    if (typeof addressObj === 'object') {
      return {
        line1: addressObj.street || addressObj.address_line1 || addressObj.line1 || addressObj.address || '',
        line2: addressObj.address_line2 || addressObj.line2 || addressObj.locality || '',
        city: addressObj.city || addressObj.district || '',
        state: addressObj.state || '',
        postal_code: addressObj.postal_code || addressObj.pincode || addressObj.zip || ''
      };
    }

    return { line1: '', line2: '', city: '', state: '', postal_code: '' };
  }

  /**
   * Format a complete address as HTML string
   */
  formatCompleteAddress(addressObj) {
    if (!addressObj) return '';
    
    const address = this.formatAddressLines(addressObj);
    const lines = [];
    
    if (address.line1) lines.push(address.line1);
    if (address.line2) lines.push(address.line2);
    if (address.city || address.postal_code) {
      const cityPostal = [address.city, address.postal_code].filter(Boolean).join(', ');
      if (cityPostal) lines.push(cityPostal);
    }
    if (address.state) lines.push(address.state);
    
    return lines.join('<br>');
  }

  /**
   * Format date in IST timezone
   */
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'  // IST timezone
    });
  }

  /**
   * Format time in IST timezone
   */
  formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'  // IST timezone
    });
  }

  /**
   * Format amount
   */
  formatAmount(amount) {
    if (typeof amount === 'string') return amount;
    return amount ? parseFloat(amount).toFixed(2) : '0.00';
  }

  /**
   * Escape HTML text for insertion in templates (basic)
   */
  // Note: Handlebars will escape by default. This is used for manual built HTML pieces.
  // Keep it simple to avoid XSS but your data should be trusted (coming from DB).
  // If you want stricter escaping, use a proper library.
  // We intentionally don't over-escape numbers.
  // eslint-disable-next-line class-methods-use-this
  escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Get document type label for display
   */
  getDocumentTypeLabel(documentType) {
    const labels = {
      'invoice': 'TAX INVOICE',
      'sales_invoice': 'TAX INVOICE',
      'quotation': 'QUOTATION',
      'sales_quotation': 'QUOTATION',
      'sales_order': 'SALES ORDER',
      'purchase_order': 'PURCHASE ORDER',
      'proforma_invoice': 'PROFORMA INVOICE',
      'delivery_note': 'DELIVERY NOTE',
      'credit_note': 'CREDIT NOTE',
      'debit_note': 'DEBIT NOTE',
      'estimate': 'ESTIMATE',
      'receipt': 'RECEIPT',
      'payment': 'PAYMENT VOUCHER'
    };

    return labels[documentType?.toLowerCase()] || 'TAX INVOICE';
  }

  /**
   * Prepare template data - Schema mapped
   */
  async prepareTemplateData(documentData, documentType, template = null) {
    // Generate UPI QR code
    const upiQRCode = await this.generateUPIQRCode(documentData);

    // Format addresses with better fallbacks
    const companyAddress = this.formatCompleteAddress(
      documentData.company?.billing_address ||
      documentData.company?.address ||
      documentData.company_address
    );

    const branchAddress = this.formatCompleteAddress(
      documentData.branch?.billing_address ||
      documentData.branch?.address ||
      documentData.branch_address
    );

    const customerAddress = this.formatCompleteAddress(
      documentData.customer?.billing_address ||
      documentData.customer?.shipping_address ||
      documentData.customer_address
    );

    // Format items array for table
    const formattedItems = (documentData.items || []).map(item => {
      // Handle nested item data from API
      const itemData = item.item || {};

      return {
        ...item,
        // Priority: display_name > print_name > item_name > nested item_name
        display_name: item.display_name || item.print_name || item.item_name || itemData.item_name || itemData.display_name || '',
        print_name: item.display_name || item.print_name || item.item_name || itemData.item_name || itemData.display_name || '',
        item_name: item.item_name || itemData.item_name || '',
        mrp: item.mrp || itemData.mrp || item.selling_price || 0,
        rate: item.rate || item.selling_price || itemData.selling_price || 0,
        amount: item.amount || item.total_amount || (item.quantity * (item.rate || item.selling_price || 0)) || 0,
        quantity: item.quantity || 0,
        hsn_sac_code: item.hsn_sac_code || item.hsn_sac || '',
        cgst_rate: item.cgst_rate || item.cgst || 0,
        sgst_rate: item.sgst_rate || item.sgst || 0,
        igst_rate: item.igst_rate || item.igst || 0,
        cgst_amount: item.cgst_amount || 0,
        sgst_amount: item.sgst_amount || 0,
        igst_amount: item.igst_amount || 0,
        taxable_amount: item.taxable_amount || 0,
        total_amount: item.total_amount || item.amount || 0,
        purchase_price: item.purchase_price || itemData.purchase_price || null,
        selling_price: item.selling_price || itemData.selling_price || null,
        discount_percentage: item.discount_percentage || 0,
        unit_name: item.unit_name || item.unit?.unit_name || ''
      };
    });

    // Build items table html for template
    const templateName = template?.template_name || '';
    console.log('🏷️ Template name for items table:', templateName);
    console.log('📄 Full template object:', {
      name: template?.template_name,
      type: template?.document_type,
      size: template?.paper_size
    });
    const itemsTableHtml = this.generateItemsTable(formattedItems, documentData.paper_size || 'A4', documentData, templateName);

    // Build tax breakdown table for A4 GST invoices
    const taxBreakdownTableHtml = this.generateTaxBreakdownTable(formattedItems);

    // Log incoming data for debugging
    console.log('📋 Preparing template data...');
    console.log('Branch data:', {
      name: documentData.branch?.name,
      billing_address: documentData.branch?.billing_address,
      address: documentData.branch?.address,
      phone: documentData.branch?.phone
    });
    console.log('Customer data:', {
      name: documentData.customer?.name,
      company_name: documentData.customer?.company_name,
      billing_address: documentData.customer?.billing_address,
      phone: documentData.customer?.phone
    });
    console.log('Formatted addresses:', {
      companyAddress,
      branchAddress,
      customerAddress
    });

    // Map data to template keys (UPPERCASE keys used by replacePlaceholders)
    const data = {
      // Document Type Label
      DOCUMENT_TYPE_LABEL: this.getDocumentTypeLabel(documentType),

      // Company & Branch
      COMPANY_NAME: documentData.company?.name || documentData.company_name || '',
      COMPANY_GSTIN: documentData.company?.gstin || documentData.company_gstin || '',
      COMPANY_PAN: documentData.company?.pan || '',
      COMPANY_PHONE: documentData.company?.phone || '',
      COMPANY_EMAIL: documentData.company?.email || '',
      COMPANY_WEBSITE: documentData.company?.website || '',
      COMPANY_ADDRESS: companyAddress,
      COMPANY_LOGO: documentData.company?.logo_url || '',
      COMPANY_LOGO_THERMAL: documentData.company?.logo_thermal_url || '',

      BRANCH_NAME: documentData.branch?.name || documentData.branch_name || '',
      BRANCH_ADDRESS: branchAddress,
      BRANCH_ADDRESS_LINE1: this.formatAddressLines(documentData.branch?.billing_address || documentData.branch?.address || documentData.branch_address).line1 || '',
      BRANCH_ADDRESS_LINE2: this.formatAddressLines(documentData.branch?.billing_address || documentData.branch?.address || documentData.branch_address).line2 || '',
      BRANCH_CITY: this.formatAddressLines(documentData.branch?.billing_address || documentData.branch?.address || documentData.branch_address).city || '',
      BRANCH_STATE: this.formatAddressLines(documentData.branch?.billing_address || documentData.branch?.address || documentData.branch_address).state || '',
      BRANCH_POSTAL_CODE: this.formatAddressLines(documentData.branch?.billing_address || documentData.branch?.address || documentData.branch_address).postal_code || '',
      BRANCH_PHONE: documentData.branch?.phone || documentData.branch_phone || '',

      // Document
      DOCUMENT_NUMBER: documentData.document_number || '',
      DOCUMENT_DATE: this.formatDate(documentData.document_date),
      DOCUMENT_TIME: this.formatTime(documentData.document_date),
      DUE_DATE: this.formatDate(documentData.due_date),

      // Customer - with better name handling for B2B
      CUSTOMER_NAME: documentData.customer?.company_name || documentData.customer?.name || documentData.customer_name || '',
      CUSTOMER_ADDRESS: customerAddress,
      CUSTOMER_GSTIN: documentData.customer?.gstin || documentData.customer_gstin || '',
      CUSTOMER_PHONE: documentData.customer?.phone || documentData.customer_phone || '',
      CUSTOMER_EMAIL: documentData.customer?.email || documentData.customer_email || '',

      // Items table (pre-rendered html)
      ITEMS_TABLE: itemsTableHtml,

      // Tax breakdown table for GST invoices
      TAX_BREAKDOWN_TABLE: taxBreakdownTableHtml,

      // Totals
      SUBTOTAL: this.formatAmount(documentData.subtotal),
      DISCOUNT_AMOUNT: documentData.discount_amount ? this.formatAmount(documentData.discount_amount) : '',
      CGST_AMOUNT: this.formatAmount(documentData.cgst_amount),
      CGST_RATE: documentData.cgst_rate || 0,
      SGST_AMOUNT: this.formatAmount(documentData.sgst_amount),
      SGST_RATE: documentData.sgst_rate || 0,
      IGST_AMOUNT: this.formatAmount(documentData.igst_amount),
      IGST_RATE: documentData.igst_rate || 0,
      TAX_AMOUNT: this.formatAmount(documentData.tax_amount),
      TOTAL_AMOUNT: this.formatAmount(documentData.total_amount),
      AMOUNT_IN_WORDS: documentData.amount_in_words || '',

      // E-Invoice Details
      EINVOICE_ARN: documentData.einvoice_arn || documentData.irn || '',
      EINVOICE_DATE: documentData.einvoice_date ? this.formatDate(documentData.einvoice_date) : '',
      EINVOICE_QR_CODE: documentData.einvoice_qr_code || '',

      // QR Codes
      QR_CODE: upiQRCode || documentData.qr_code || '',

      // Bank account info
      BANK_NAME: documentData.bank_account?.bank_name || (documentData.company?.settings?.bank_account?.bank_name) || '',
      BANK_ACCOUNT_NUMBER: documentData.bank_account?.account_number || (documentData.company?.settings?.bank_account?.account_number) || '',
      BANK_IFSC_CODE: documentData.bank_account?.ifsc_code || (documentData.company?.settings?.bank_account?.ifsc) || '',
      BANK_BRANCH: documentData.bank_account?.branch || (documentData.company?.settings?.bank_account?.branch) || '',

      // UPI Details
      UPI_ID: documentData.company?.settings?.upi_id || documentData.upi_id || '',

      // GST Type
      GST_TYPE: documentData.gst_type || '',

      // Reference
      REFERENCE_NUMBER: documentData.reference_number || documentData.po_number || '',

      // Additional
      NOTES: documentData.notes || '',
      TERMS_CONDITIONS: documentData.terms_conditions || documentData.terms || '',
      COMPANY_TAGLINE: documentData.company?.tagline || '',
      COMPANY_FSSAI: documentData.company?.fssai || documentData.fssai_number || '',
      BRANCH_EMAIL: documentData.branch?.email || '',

      // Payment & Delivery Info
      PAYMENT_TYPE: documentData.payment_type || documentData.payment_mode || '',
      DELIVERY_SLOT: documentData.delivery_slot || '',
      PLACE_OF_SUPPLY: documentData.place_of_supply || documentData.state || '',
      DELIVERY_NOTE: documentData.delivery_note || documentData.delivery_instructions || '',
      SAVINGS_AMOUNT: documentData.savings_amount || documentData.total_savings || '',

      // Flags
      TAX_BREAKDOWN: !!(documentData.cgst_amount || documentData.sgst_amount)
    };

    // Log final mapped data for debugging
    console.log('📄 Final template data:', {
      BRANCH_NAME: data.BRANCH_NAME,
      BRANCH_ADDRESS: data.BRANCH_ADDRESS,
      BRANCH_PHONE: data.BRANCH_PHONE,
      CUSTOMER_NAME: data.CUSTOMER_NAME,
      CUSTOMER_ADDRESS: data.CUSTOMER_ADDRESS,
      CUSTOMER_PHONE: data.CUSTOMER_PHONE,
      CUSTOMER_GSTIN: data.CUSTOMER_GSTIN
    });

    return data;
  }

  /**
   * Print document with template
   */
  async printDocumentWithTemplate(documentData, documentType, companyId, template) {
    try {
      console.log('🖨️ Printing with template:', template.template_name);
      console.log('📄 Template preview (first 500 chars):', template.template_html?.substring(0, 500));

      const templateData = await this.prepareTemplateData(documentData, documentType, template);
      await pdfGenerationService.printHTML(template.template_html, templateData);
      return true;
    } catch (error) {
      console.error('Error printing document with template:', error);
      throw new Error('Failed to print document: ' + error.message);
    }
  }

  /**
   * Download document PDF with template
   */
  async downloadDocumentPDFWithTemplate(documentData, documentType, companyId, filename, template) {
    try {
      const templateData = await this.prepareTemplateData(documentData, documentType, template);
      const pdfBlob = await pdfGenerationService.generatePDF(
        template.template_html,
        templateData,
        {
          orientation: template.orientation || 'portrait',
          format: template.paper_size || 'A4'
        }
      );
      pdfGenerationService.downloadPDF(pdfBlob, filename);
      return true;
    } catch (error) {
      console.error('Error downloading document PDF with template:', error);
      throw new Error('Failed to download PDF: ' + error.message);
    }
  }

  /**
   * Generate PDF for document
   */
  async generateDocumentPDF(documentData, documentType, companyId) {
    try {
      const template = await this.getTemplate(
        documentType,
        documentData.paper_size || 'A4',
        companyId
      );
      const templateData = await this.prepareTemplateData(documentData, documentType, template);
      const pdfBlob = await pdfGenerationService.generatePDF(
        template.template_html,
        templateData,
        {
          orientation: template.orientation || 'portrait',
          format: template.paper_size || 'A4'
        }
      );
      return pdfBlob;
    } catch (error) {
      console.error('Error generating document PDF:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  }
}

const printService = new PrintService();
export default printService;