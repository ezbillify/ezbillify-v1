// src/services/printService.js
import pdfGenerationService from './pdfGenerationService';
import { templateDefinitions } from '../components/others/PrintTemplateDefinitions';
import QRCode from 'qrcode';

class PrintService {
  constructor() {
    this.templateCache = new Map();
  }

  /**
   * Get template for document type and paper size
   * @param {string} documentType - Type of document (invoice, bill, etc.)
   * @param {string} paperSize - Paper size (A4, 80mm, etc.)
   * @param {string} companyId - Company ID
   * @returns {Object} Template data
   */
  async getTemplate(documentType, paperSize, companyId) {
    try {
      // First check cache
      const cacheKey = `${documentType}-${paperSize}-${companyId}`;
      if (this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey);
      }

      // If not in cache, fetch from API - get all templates for document type
      const response = await fetch(`/api/settings/print-templates?company_id=${companyId}`);
      const result = await response.json();

      if (result.success && result.data) {
        // Find template matching both document type and paper size
        const template = result.data.find(t => 
          t.document_type === documentType && 
          t.paper_size === (paperSize || 'A4')
        );
        
        if (template) {
          // Cache the template
          this.templateCache.set(cacheKey, template);
          return template;
        }
      }

      // Fallback to default template
      return this.getDefaultTemplate(documentType, paperSize);
    } catch (error) {
      console.error('Error fetching template:', error);
      // Fallback to default template
      return this.getDefaultTemplate(documentType, paperSize);
    }
  }

  /**
   * Get template ID for document type
   * @param {string} documentType - Document type
   * @returns {string} Template ID
   */
  getTemplateIdForType(documentType) {
    const typeMap = {
      'invoice': 'modern',
      'quotation': 'modern',
      'sales_order': 'modern',
      'bill': 'modern',
      'purchase_order': 'modern',
      'payment_receipt': 'thermal-compact'
    };
    
    return typeMap[documentType] || 'modern';
  }

  /**
   * Get HTML for template definition
   * @param {Object} templateDef - Template definition
   * @returns {string} HTML content
   */
  getTemplateHTML(templateDef) {
    // This would load the actual HTML file
    // For now, return a placeholder
    return `<html>
      <head>
        <style>
          @page { size: ${templateDef.paperSize}; margin: 15mm; }
          body { font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        <h1>Document</h1>
        <p>Template: ${templateDef.name}</p>
        <p>Paper Size: ${templateDef.paperSize}</p>
      </body>
    </html>`;
  }

  /**
   * Get default template when custom template is not available
   * @param {string} documentType - Type of document
   * @param {string} paperSize - Paper size
   * @returns {Object} Default template
   */
  getDefaultTemplate(documentType, paperSize) {
    // Find matching template in templateDefinitions
    const templateKey = `${paperSize}-${this.getTemplateIdForType(documentType)}`;
    const templateDef = templateDefinitions[templateKey];
    
    if (templateDef) {
      return {
        template_html: this.getTemplateHTML(templateDef),
        paper_size: paperSize,
        orientation: paperSize === 'A3' ? 'landscape' : 'portrait'
      };
    }

    // Fallback to basic HTML
    return {
      template_html: this.getBasicTemplate(documentType),
      paper_size: paperSize || 'A4',
      orientation: 'portrait'
    };
  }

  /**
   * Get basic template HTML
   * @param {string} documentType - Document type
   * @returns {string} Basic HTML template
   */
  getBasicTemplate(documentType) {
    return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${documentType}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .document-title { font-size: 24px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="document-title">${documentType.toUpperCase()}</div>
        </div>
        <div class="content">
          <!-- Document content will be inserted here -->
        </div>
      </body>
      </html>`;
  }

  /**
   * Generate QR code for document
   * @param {Object} documentData - Document data
   * @param {string} documentType - Document type
   * @returns {string} QR code as Data URL
   */
  async generateDocumentQRCode(documentData, documentType) {
    try {
      // Create QR code data
      const qrData = JSON.stringify({
        id: documentData.id,
        documentType: documentType,
        documentNumber: documentData.document_number,
        date: documentData.document_date,
        amount: documentData.total_amount,
        companyId: documentData.company_id,
        branchId: documentData.branch_id,
        customerId: documentData.customer_id
      });

      // Generate QR code as Data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return ''; // Return empty string if QR code generation fails
    }
  }

  /**
   * Generate UPI QR code for payment
   * @param {Object} documentData - Document data
   * @returns {string} UPI QR code as Data URL
   */
  async generateUPIQRCode(documentData) {
    try {
      // Check if we have bank account with UPI ID
      if (!documentData.bank_account || !documentData.bank_account.upi_id) {
        return ''; // Return empty string if no UPI ID
      }

      const upiId = documentData.bank_account.upi_id;
      const amount = documentData.total_amount;
      const note = `Payment for Invoice ${documentData.document_number}`;
      const customerName = documentData.customer?.name || documentData.customer_name || '';

      // Create UPI QR code data
      // Format: upi://pay?pa=UPI_ID&pn=PayeeName&am=Amount&cu=INR&tn=Note
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

      // Generate QR code as Data URL
      const qrCodeDataUrl = await QRCode.toDataURL(upiUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating UPI QR code:', error);
      return ''; // Return empty string if QR code generation fails
    }
  }

  /**
   * Generate table rows for items based on paper size
   * @param {Array} items - Array of items
   * @param {string} paperSize - Paper size
   * @param {Object} documentData - Document data
   * @returns {string} HTML table rows
   */
  generateItemsTable(items, paperSize, documentData) {
    const formatAmount = (amount) => {
      if (typeof amount === 'string') return amount;
      return amount ? amount.toFixed(2) : '0.00';
    };

    // Check paper size to determine table structure
    if (paperSize === '58mm') {
      // Ultra compact format for 58mm
      return items.map(item => `
        <tr>
          <td class="text-left">${item.name || item.item_name || ''}</td>
          <td class="text-right">${item.quantity || 0}</td>
          <td class="text-right">${formatAmount(item.rate || 0)}</td>
          <td class="text-right">${formatAmount(item.amount || item.total || 0)}</td>
        </tr>
      `).join('');
    } else if (paperSize === '80mm') {
      // Compact format for 80mm thermal
      const isDetailed = documentData.template_type?.includes('detailed');
      if (isDetailed) {
        return items.map((item, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${item.name || item.item_name || ''}</td>
            <td>${item.hsn_sac || ''}</td>
            <td class="text-right">${item.quantity || 0}</td>
            <td>${item.unit || 'PCS'}</td>
            <td class="text-right">${formatAmount(item.rate || 0)}</td>
            <td class="text-center">${item.tax_percentage || 0}%</td>
            <td class="text-right">${formatAmount(item.amount || item.total || 0)}</td>
          </tr>
        `).join('');
      } else {
        return items.map(item => `
          <tr>
            <td class="text-left">${item.name || item.item_name || ''}</td>
            <td class="text-right">${item.quantity || 0}</td>
            <td class="text-right">${formatAmount(item.rate || 0)}</td>
            <td class="text-right">${formatAmount(item.amount || item.total || 0)}</td>
          </tr>
        `).join('');
      }
    } else {
      // Standard format for A4/A3/A5
      return items.map((item, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${item.name || item.item_name || ''}</td>
          <td class="text-center">${item.hsn_sac || ''}</td>
          <td class="text-right">${item.quantity || 0}</td>
          <td class="text-center">${item.unit || 'PCS'}</td>
          <td class="text-right">${formatAmount(item.rate || 0)}</td>
          <td class="text-center">${item.tax_percentage || 0}%</td>
          <td class="text-right">${formatAmount(item.amount || item.total || 0)}</td>
        </tr>
      `).join('');
    }
  }

  /**
   * Prepare data for template
   * @param {Object} documentData - Document data
   * @param {string} documentType - Document type
   * @returns {Promise<Object>} Prepared data
   */
  async prepareTemplateData(documentData, documentType) {
    // Format dates
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    };

    // Format time
    const formatTime = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    // Format address - handles both JSONB and regular objects
    const formatAddress = (addressObj) => {
      if (!addressObj) return '';

      // If it's already a string, return as is
      if (typeof addressObj === 'string') {
        return addressObj;
      }

      // If it's an object, format it properly
      if (typeof addressObj === 'object') {
        const parts = [
          addressObj.street || addressObj.address_line1,
          addressObj.city,
          addressObj.state,
          addressObj.postal_code,
          addressObj.country
        ].filter(Boolean);
        
        return parts.join(', ');
      }

      return '';
    };

    // Format address lines separately
    const formatAddressLines = (addressObj) => {
      if (!addressObj) return { line1: '', line2: '', city: '', state: '', postal_code: '' };

      // If it's already a string, return as is
      if (typeof addressObj === 'string') {
        return { line1: addressObj, line2: '', city: '', state: '', postal_code: '' };
      }

      // If it's an object, format it properly
      if (typeof addressObj === 'object') {
        return {
          line1: addressObj.street || addressObj.address_line1 || '',
          line2: addressObj.address_line2 || '',
          city: addressObj.city || '',
          state: addressObj.state || '',
          postal_code: addressObj.postal_code || ''
        };
      }

      return { line1: '', line2: '', city: '', state: '', postal_code: '' };
    };

    // Format amount
    const formatAmount = (amount) => {
      if (typeof amount === 'string') return amount;
      return amount ? amount.toFixed(2) : '0.00';
    };

    // Generate QR code for the document
    const documentQRCode = await this.generateDocumentQRCode(documentData, documentType);
    
    // Generate UPI QR code for payment
    const upiQRCode = await this.generateUPIQRCode(documentData);

    // Format address lines
    const branchAddress = formatAddressLines(documentData.branch?.address || documentData.branch_address);
    const customerAddress = formatAddressLines(documentData.customer?.billing_address || documentData.customer_address);

    // Prepare data object
    const data = {
      // Company & Branch
      COMPANY_NAME: documentData.company?.name || documentData.company_name || '',
      COMPANY_GSTIN: documentData.company?.gstin || documentData.company_gstin || '',
      COMPANY_LOGO: documentData.company?.logo_url || '',
      COMPANY_LOGO_THERMAL: documentData.company?.logo_thermal_url || '',
      BRANCH_NAME: documentData.branch?.name || documentData.branch_name || '',
      BRANCH_ADDRESS_LINE1: branchAddress.line1,
      BRANCH_ADDRESS_LINE2: branchAddress.line2,
      BRANCH_CITY: branchAddress.city,
      BRANCH_STATE: branchAddress.state,
      BRANCH_POSTAL_CODE: branchAddress.postal_code,
      BRANCH_PHONE: documentData.branch?.phone || documentData.branch_phone || '',
      BRANCH_EMAIL: documentData.branch?.email || documentData.branch_email || '',

      // Document
      DOCUMENT_TYPE: documentData.document_type_label || documentType.replace('_', ' ').toUpperCase(),
      DOCUMENT_NUMBER: documentData.document_number || '',
      DOCUMENT_DATE: formatDate(documentData.document_date),
      DOCUMENT_TIME: formatTime(documentData.document_date),
      DUE_DATE: formatDate(documentData.due_date),
      REFERENCE_NUMBER: documentData.reference_number || '',
      PLACE_OF_SUPPLY: documentData.place_of_supply || '',

      // Customer
      CUSTOMER_NAME: documentData.customer?.name || documentData.customer_name || '',
      CUSTOMER_ADDRESS: formatAddress(documentData.customer?.billing_address || documentData.customer_address),
      CUSTOMER_GSTIN: documentData.customer?.gstin || documentData.customer_gstin || '',
      CUSTOMER_PHONE: documentData.customer?.phone || documentData.customer_phone || '',
      CUSTOMER_EMAIL: documentData.customer?.email || documentData.customer_email || '',

      // Items table
      ITEMS_TABLE: this.generateItemsTable(documentData.items || [], documentData.paper_size, documentData),

      // Totals
      SUBTOTAL: formatAmount(documentData.subtotal),
      DISCOUNT_AMOUNT: documentData.discount_amount ? formatAmount(documentData.discount_amount) : '',
      CGST_AMOUNT: formatAmount(documentData.cgst_amount),
      SGST_AMOUNT: formatAmount(documentData.sgst_amount),
      IGST_AMOUNT: formatAmount(documentData.igst_amount),
      TAX_AMOUNT: formatAmount(documentData.tax_amount),
      TOTAL_AMOUNT: formatAmount(documentData.total_amount),
      AMOUNT_IN_WORDS: documentData.amount_in_words || '',

      // Tax rates
      CGST_RATE: documentData.cgst_rate || 0,
      SGST_RATE: documentData.sgst_rate || 0,
      IGST_RATE: documentData.igst_rate || 0,

      // QR Codes
      DOCUMENT_QR_CODE: documentQRCode,
      QR_CODE: upiQRCode, // For backward compatibility

      // Bank account info
      BANK_ACCOUNT_NUMBER: documentData.bank_account?.account_number ? 
        'XXXX' + documentData.bank_account.account_number.slice(-4) : '',
      BANK_IFSC_CODE: documentData.bank_account?.ifsc_code || '',

      // Additional info
      NOTES: documentData.notes || '',
      TERMS_CONDITIONS: documentData.terms_conditions || documentData.terms || '',

      // Raw items array for PDF generation
      ITEMS: documentData.items || []
    };

    return data;
  }

  /**
   * Generate PDF for document
   * @param {Object} documentData - Document data
   * @param {string} documentType - Document type
   * @param {string} companyId - Company ID
   * @returns {Blob} PDF blob
   */
  async generateDocumentPDF(documentData, documentType, companyId) {
    try {
      // Get template
      const template = await this.getTemplate(
        documentType,
        documentData.paper_size || 'A4',
        companyId
      );

      // Prepare data for template
      const templateData = await this.prepareTemplateData(documentData, documentType);

      // Generate PDF
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

  /**
   * Print document with specific template
   * @param {Object} documentData - Document data
   * @param {string} documentType - Document type
   * @param {string} companyId - Company ID
   * @param {Object} template - Selected template
   * @returns {Promise} Print promise
   */
  async printDocumentWithTemplate(documentData, documentType, companyId, template) {
    try {
      // Prepare data for template
      const templateData = await this.prepareTemplateData(documentData, documentType);

      // Print HTML directly for better quality (preserves exact styling)
      await pdfGenerationService.printHTML(template.template_html, templateData);

      return true;
    } catch (error) {
      console.error('Error printing document with template:', error);
      throw new Error('Failed to print document: ' + error.message);
    }
  }
}

// Export singleton instance
const printService = new PrintService();
export default printService;