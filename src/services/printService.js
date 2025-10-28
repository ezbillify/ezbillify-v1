// src/services/printService.js
import pdfGenerationService from './pdfGenerationService';
import { templateDefinitions } from '../components/others/PrintTemplateDefinitions';

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

    // Format address - handles both JSONB and regular objects
    const formatAddress = (addressObj) => {
      if (!addressObj) return '';

      // If it's a string (JSONB from database), parse it
      if (typeof addressObj === 'string') {
        try {
          addressObj = JSON.parse(addressObj);
        } catch {
          return addressObj; // Return as-is if can't parse
        }
      }

      const parts = [];
      if (addressObj.address_line1 || addressObj.line1) parts.push(addressObj.address_line1 || addressObj.line1);
      if (addressObj.address_line2 || addressObj.line2) parts.push(addressObj.address_line2 || addressObj.line2);
      const cityState = [
        addressObj.city,
        addressObj.state,
        addressObj.pincode || addressObj.postal_code
      ].filter(Boolean).join(', ');
      if (cityState) parts.push(cityState);
      return parts.join(', ');
    };

    // Format amount in Indian number format (lakhs/crores) without currency symbol
    const formatAmount = (amount) => {
      if (!amount && amount !== 0) return '0.00';
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) return '0.00';

      // Indian number format: 10,00,000.00
      const parts = numAmount.toFixed(2).split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1];

      // Add commas in Indian style (last 3 digits, then every 2 digits)
      let lastThree = integerPart.substring(integerPart.length - 3);
      let otherNumbers = integerPart.substring(0, integerPart.length - 3);
      if (otherNumbers !== '') {
        lastThree = ',' + lastThree;
      }
      const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
      return formatted + '.' + decimalPart;
    };

    // Convert number to words (Indian style)
    const numberToWords = (num) => {
      if (!num) return 'Zero Only';

      const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
      const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

      const convertLessThanThousand = (n) => {
        if (n === 0) return '';
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n/10)] + (n % 10 ? ' ' + a[n % 10] : '');
        return a[Math.floor(n/100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
      };

      const number = Math.floor(num);
      if (number === 0) return 'Zero Only';

      let result = '';

      // Crores
      const crores = Math.floor(number / 10000000);
      if (crores > 0) {
        result += convertLessThanThousand(crores) + ' Crore ';
      }

      // Lakhs
      const lakhs = Math.floor((number % 10000000) / 100000);
      if (lakhs > 0) {
        result += convertLessThanThousand(lakhs) + ' Lakh ';
      }

      // Thousands
      const thousands = Math.floor((number % 100000) / 1000);
      if (thousands > 0) {
        result += convertLessThanThousand(thousands) + ' Thousand ';
      }

      // Hundreds
      const remainder = number % 1000;
      if (remainder > 0) {
        result += convertLessThanThousand(remainder);
      }

      return result.trim() + ' Only';
    };

    // Get document type label
    const getDocumentTypeLabel = (type) => {
      const labels = {
        'invoice': 'Sales Invoice',
        'quotation': 'Quotation',
        'sales_order': 'Sales Order',
        'purchase_order': 'Purchase Order',
        'bill': 'Purchase Bill',
        'payment_receipt': 'Payment Receipt'
      };
      return labels[type] || type.toUpperCase();
    };

    // Fetch branch data if branch_id exists (or use already loaded branch data)
    let branchData = documentData.branch || null;
    if (!branchData && documentData.branch_id) {
      try {
        // Try to fetch branch data from API
        const response = await fetch(`/api/branches/${documentData.branch_id}`);
        if (response.ok) {
          branchData = await response.json(); // API returns branch directly, not wrapped
        }
      } catch (error) {
        console.error('Error fetching branch data:', error);
        // If fetch fails, try to use branch info from document if available
        branchData = null;
      }
    }

    // Generate items table HTML
    const generateItemsTable = (items, paperSize) => {
      if (!items || items.length === 0) return '';

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
        // Full format for A4, A3, A5
        return items.map((item, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${item.name || item.item_name || ''}</td>
            <td>${item.hsn_sac || ''}</td>
            <td class="text-center">${item.quantity || 0}</td>
            <td>${item.unit || 'PCS'}</td>
            <td class="text-right">${formatAmount(item.rate || 0)}</td>
            <td class="text-center">${item.tax_percentage || 0}%</td>
            <td class="text-right">${formatAmount(item.amount || item.total || 0)}</td>
          </tr>
        `).join('');
      }
    };

    // Common data fields
    const data = {
      // Company info
      COMPANY_NAME: documentData.company?.name || '',
      COMPANY_ADDRESS: formatAddress(documentData.company?.address) || '',
      COMPANY_PHONE: documentData.company?.phone || '',
      COMPANY_EMAIL: documentData.company?.email || '',
      COMPANY_GSTIN: documentData.company?.gstin || '',
      COMPANY_LOGO: documentData.company?.logo_url || '',

      // Branch info (if available)
      BRANCH_NAME: branchData?.name || documentData.branch?.name || '',
      BRANCH_ADDRESS: formatAddress(branchData?.address || documentData.branch?.address) || '',
      BRANCH_PHONE: branchData?.phone || documentData.branch?.phone || '',
      BRANCH_EMAIL: branchData?.email || documentData.branch?.email || '',

      // Document info
      DOCUMENT_TYPE: getDocumentTypeLabel(documentType),
      DOCUMENT_NUMBER: documentData.document_number || '',
      DOCUMENT_DATE: formatDate(documentData.document_date || documentData.date) || '',
      DUE_DATE: formatDate(documentData.due_date) || '',
      REFERENCE_NUMBER: documentData.reference_number || documentData.reference || '',
      PLACE_OF_SUPPLY: documentData.place_of_supply || '',

      // Customer/Vendor info
      CUSTOMER_NAME: documentData.customer?.name || documentData.vendor?.name || documentData.customer_name || documentData.vendor_name || '',
      CUSTOMER_ADDRESS: formatAddress(documentData.customer?.billing_address || documentData.vendor?.address) || '',
      CUSTOMER_PHONE: documentData.customer?.phone || documentData.vendor?.phone || '',
      CUSTOMER_EMAIL: documentData.customer?.email || documentData.vendor?.email || '',
      CUSTOMER_GSTIN: documentData.customer?.gstin || documentData.vendor?.gstin || '',

      // Amounts (formatted without currency symbols)
      SUBTOTAL: formatAmount(documentData.subtotal || 0),
      DISCOUNT_AMOUNT: formatAmount(documentData.discount_amount || 0),
      TAX_AMOUNT: formatAmount(documentData.tax_amount || 0),
      CGST_AMOUNT: formatAmount(documentData.cgst_amount || 0),
      SGST_AMOUNT: formatAmount(documentData.sgst_amount || 0),
      IGST_AMOUNT: formatAmount(documentData.igst_amount || 0),
      TOTAL_AMOUNT: formatAmount(documentData.total_amount || documentData.grand_total || 0),
      AMOUNT_IN_WORDS: numberToWords(documentData.total_amount || documentData.grand_total || 0),

      // Items table HTML
      ITEMS_TABLE: generateItemsTable(documentData.items || [], documentData.paper_size || 'A4'),

      // Additional info
      NOTES: documentData.notes || '',
      TERMS_CONDITIONS: documentData.terms_conditions || documentData.terms || '',

      // Raw items array for PDF generation
      ITEMS: documentData.items || []
    };

    return data;
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

  /**
   * Download document PDF with specific template
   * @param {Object} documentData - Document data
   * @param {string} documentType - Document type
   * @param {string} companyId - Company ID
   * @param {string} filename - Download filename
   * @param {Object} template - Selected template
   * @returns {Promise} Download promise
   */
  async downloadDocumentPDFWithTemplate(documentData, documentType, companyId, filename, template) {
    try {
      // Prepare data for template
      const templateData = await this.prepareTemplateData(documentData, documentType);

      // Generate PDF with selected template
      const pdfBlob = await pdfGenerationService.generatePDF(
        template.template_html,
        templateData,
        {
          orientation: template.orientation || 'portrait',
          format: template.paper_size || 'A4'
        }
      );

      // Download the PDF
      await pdfGenerationService.downloadPDF(pdfBlob, filename);

      return true;
    } catch (error) {
      console.error('Error downloading document with template:', error);
      throw new Error('Failed to download document: ' + error.message);
    }
  }

  /**
   * Print document (original method for backward compatibility)
   * @param {Object} documentData - Document data
   * @param {string} documentType - Document type
   * @param {string} companyId - Company ID
   * @returns {Promise} Print promise
   */
  async printDocument(documentData, documentType, companyId) {
    // For backward compatibility, use default paper size (A4)
    const template = await this.getTemplate(documentType, 'A4', companyId);
    return this.printDocumentWithTemplate(documentData, documentType, companyId, template);
  }

  /**
   * Download document PDF (original method for backward compatibility)
   * @param {Object} documentData - Document data
   * @param {string} documentType - Document type
   * @param {string} companyId - Company ID
   * @param {string} filename - Download filename
   * @returns {Promise} Download promise
   */
  async downloadDocumentPDF(documentData, documentType, companyId, filename) {
    // For backward compatibility, use default paper size (A4)
    const template = await this.getTemplate(documentType, 'A4', companyId);
    return this.downloadDocumentPDFWithTemplate(documentData, documentType, companyId, filename, template);
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.templateCache.clear();
  }
}

// Export singleton instance
const printService = new PrintService();
export default printService;