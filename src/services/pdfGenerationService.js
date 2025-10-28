// src/services/pdfGenerationService.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

class PDFGenerationService {
  constructor() {
    this.defaultOptions = {
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    };
  }

  /**
   * Generate PDF from HTML template
   * @param {string} htmlContent - HTML template with placeholders
   * @param {Object} data - Data to replace placeholders
   * @param {Object} options - PDF options (format, orientation, etc.)
   * @returns {Blob} PDF blob
   */
  async generatePDF(htmlContent, data, options = {}) {
    try {
      // Replace placeholders with actual data
      const processedHTML = this.replacePlaceholders(htmlContent, data);

      // Use the HTML rendering method for all templates to preserve styling
      return await this.generatePDFFromHTML(processedHTML, options);
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  }

  /**
   * Generate PDF from processed HTML using iframe rendering
   * @param {string} processedHTML - HTML with data filled in
   * @param {Object} options - PDF options
   * @returns {Promise<Blob>} PDF blob
   */
  async generatePDFFromHTML(processedHTML, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Create hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = options.format === '80mm' ? '80mm' : options.format === '58mm' ? '58mm' : '210mm';
        iframe.style.height = '297mm';
        document.body.appendChild(iframe);

        // Write content to iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(processedHTML);
        iframeDoc.close();

        // Wait for content to load
        iframe.onload = () => {
          setTimeout(async () => {
            try {
              // Use html2canvas to convert to image, then jsPDF
              const html2canvas = (await import('html2canvas')).default;
              const canvas = await html2canvas(iframeDoc.body, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
              });

              // Determine page size
              let pdfFormat = 'a4';
              let pdfOrientation = 'portrait';

              if (options.format === '80mm') {
                pdfFormat = [80, 297]; // 80mm width, A4 height
                pdfOrientation = 'portrait';
              } else if (options.format === '58mm') {
                pdfFormat = [58, 297]; // 58mm width, A4 height
                pdfOrientation = 'portrait';
              } else if (options.format === 'A3' || options.format === 'a3') {
                pdfFormat = 'a3';
                pdfOrientation = options.orientation || 'landscape';
              } else if (options.format === 'A5' || options.format === 'a5') {
                pdfFormat = 'a5';
                pdfOrientation = 'portrait';
              }

              const doc = new jsPDF({
                orientation: pdfOrientation,
                unit: 'mm',
                format: pdfFormat
              });

              const imgData = canvas.toDataURL('image/png');
              const imgWidth = doc.internal.pageSize.getWidth();
              const imgHeight = (canvas.height * imgWidth) / canvas.width;

              doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

              // Clean up
              document.body.removeChild(iframe);
              resolve(doc.output('blob'));
            } catch (error) {
              document.body.removeChild(iframe);
              reject(error);
            }
          }, 500); // Give time for styles to load
        };

        iframe.onerror = () => {
          document.body.removeChild(iframe);
          reject(new Error('Failed to load iframe content'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate A4 PDF with direct layout control
   * @param {Object} data - Document data
   * @param {Object} options - PDF options
   * @returns {Blob} PDF blob
   */
  generateA4PDF(data, options) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Set colors
    const primaryColor = [37, 99, 235]; // blue-600
    const lightColor = [248, 250, 252]; // slate-50
    const darkColor = [30, 41, 59]; // slate-900
    const textColor = [51, 51, 51]; // dark gray
    
    // Set font and size
    doc.setFont('helvetica');
    doc.setFontSize(12);
    
    // Add margins
    const marginLeft = 20;
    const marginTop = 20;
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    let currentY = marginTop;
    
    // Add company header with background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(marginLeft - 5, currentY - 10, pageWidth - (marginLeft * 2) + 10, 35, 'F');
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(data.COMPANY_NAME || '', marginLeft, currentY);
    currentY += 9;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.text(data.COMPANY_ADDRESS || '', marginLeft, currentY);
    currentY += 6;
    
    const contactInfo = `${data.COMPANY_PHONE ? `Phone: ${data.COMPANY_PHONE}` : ''}${data.COMPANY_EMAIL ? ` | Email: ${data.COMPANY_EMAIL}` : ''}`;
    if (contactInfo) {
      doc.text(contactInfo, marginLeft, currentY);
      currentY += 6;
    }
    
    if (data.COMPANY_GSTIN) {
      doc.text(`GSTIN: ${data.COMPANY_GSTIN}`, marginLeft, currentY);
      currentY += 15;
    }
    
    // Add horizontal line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, currentY, pageWidth - marginLeft, currentY);
    currentY += 15;
    
    // Add document title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('INVOICE', pageWidth - marginLeft, currentY, null, null, 'right');
    currentY += 12;
    
    // Add invoice details box
    const detailsBoxWidth = 80;
    const detailsBoxX = pageWidth - marginLeft - detailsBoxWidth;
    const detailsBoxHeight = 35;
    
    doc.setFillColor(238, 242, 255); // blue-50
    doc.roundedRect(detailsBoxX, currentY, detailsBoxWidth, detailsBoxHeight, 2, 2, 'F');
    doc.setDrawColor(...primaryColor);
    doc.roundedRect(detailsBoxX, currentY, detailsBoxWidth, detailsBoxHeight, 2, 2, 'S');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkColor);
    
    let invoiceDetailY = currentY + 7;
    if (data.DOCUMENT_NUMBER) {
      doc.text(`Invoice #: ${data.DOCUMENT_NUMBER}`, detailsBoxX + 5, invoiceDetailY);
      invoiceDetailY += 5;
    }
    
    if (data.DOCUMENT_DATE) {
      doc.text(`Date: ${data.DOCUMENT_DATE}`, detailsBoxX + 5, invoiceDetailY);
      invoiceDetailY += 5;
    }
    
    if (data.DUE_DATE) {
      doc.text(`Due Date: ${data.DUE_DATE}`, detailsBoxX + 5, invoiceDetailY);
      invoiceDetailY += 5;
    }
    
    currentY += detailsBoxHeight + 15;
    
    // Add customer info section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Bill To:', marginLeft, currentY);
    currentY += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.text(data.CUSTOMER_NAME || '', marginLeft, currentY);
    currentY += 6;
    
    if (data.CUSTOMER_ADDRESS) {
      doc.text(data.CUSTOMER_ADDRESS, marginLeft, currentY);
      currentY += 6;
    }
    
    const customerContact = `${data.CUSTOMER_PHONE ? `Phone: ${data.CUSTOMER_PHONE}` : ''}${data.CUSTOMER_EMAIL ? ` | Email: ${data.CUSTOMER_EMAIL}` : ''}`;
    if (customerContact) {
      doc.text(customerContact, marginLeft, currentY);
      currentY += 6;
    }
    
    if (data.CUSTOMER_GSTIN) {
      doc.text(`GSTIN: ${data.CUSTOMER_GSTIN}`, marginLeft, currentY);
      currentY += 15;
    }
    
    // Add details section (right side)
    const rightX = 120;
    let customerDetailY = currentY - 35; // Align with customer info
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Details:', rightX, customerDetailY);
    customerDetailY += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    if (data.PAYMENT_TERMS) {
      doc.text(`Terms: ${data.PAYMENT_TERMS}`, rightX, customerDetailY);
      customerDetailY += 6;
    }
    
    if (data.PLACE_OF_SUPPLY) {
      doc.text(`Place of Supply: ${data.PLACE_OF_SUPPLY}`, rightX, customerDetailY);
      customerDetailY += 6;
    }
    
    // Update currentY to the maximum of both sections
    currentY = Math.max(currentY, customerDetailY) + 10;
    
    // Add items table
    if (data.ITEMS && data.ITEMS.length > 0) {
      const tableData = data.ITEMS.map(item => [
        item.name || item.item_name || '',
        item.description || '',
        item.hsn_sac || '',
        item.quantity || 0,
        item.unit || '',
        `${(item.rate || 0).toFixed(2)}`,
        item.tax_percentage ? `${item.tax_percentage}%` : '',
        `${(item.amount || item.total || 0).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        head: [['Item', 'Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Tax', 'Amount']],
        body: tableData,
        startY: currentY,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: lightColor
        },
        margin: { left: marginLeft, right: marginLeft },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 40 },
          2: { cellWidth: 20 },
          3: { cellWidth: 15, halign: 'right' },
          4: { cellWidth: 15 },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 15, halign: 'right' },
          7: { cellWidth: 25, halign: 'right' }
        }
      });
      
      // Get the final Y position after the table
      const finalY = doc.lastAutoTable.finalY || currentY + 20;
      currentY = finalY + 15;
    }
    
    // Add totals section
    const totalsX = pageWidth - 80;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    
    if (data.SUBTOTAL) {
      doc.text('Subtotal:', totalsX, currentY);
      doc.text(`${data.SUBTOTAL}`, pageWidth - marginLeft, currentY, null, null, 'right');
      currentY += 7;
    }
    
    if (data.CGST_AMOUNT) {
      doc.text('CGST:', totalsX, currentY);
      doc.text(`${data.CGST_AMOUNT}`, pageWidth - marginLeft, currentY, null, null, 'right');
      currentY += 7;
    }
    
    if (data.SGST_AMOUNT) {
      doc.text('SGST:', totalsX, currentY);
      doc.text(`${data.SGST_AMOUNT}`, pageWidth - marginLeft, currentY, null, null, 'right');
      currentY += 7;
    }
    
    if (data.IGST_AMOUNT) {
      doc.text('IGST:', totalsX, currentY);
      doc.text(`${data.IGST_AMOUNT}`, pageWidth - marginLeft, currentY, null, null, 'right');
      currentY += 7;
    }
    
    // Final total with emphasis
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.line(totalsX - 5, currentY - 2, pageWidth - marginLeft + 5, currentY - 2);
    doc.line(totalsX - 5, currentY + 5, pageWidth - marginLeft + 5, currentY + 5);
    
    if (data.TOTAL_AMOUNT) {
      doc.text('Total Amount:', totalsX, currentY + 5);
      doc.text(`${data.TOTAL_AMOUNT}`, pageWidth - marginLeft, currentY + 5, null, null, 'right');
      currentY += 15;
    }
    
    // Add terms and conditions
    if (data.TERMS_AND_CONDITIONS) {
      currentY += 10;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Terms & Conditions:', marginLeft, currentY);
      currentY += 7;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      
      // Split terms into lines that fit the page width
      const termsLines = doc.splitTextToSize(data.TERMS_AND_CONDITIONS, pageWidth - (marginLeft * 2));
      doc.text(termsLines, marginLeft, currentY);
      currentY += (termsLines.length * 5) + 15;
    }
    
    // Add footer
    currentY = Math.max(currentY, pageHeight - 30); // Ensure footer is at bottom
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(marginLeft, currentY, pageWidth - marginLeft, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Thank you for your business!', pageWidth / 2, currentY, null, null, 'center');
    currentY += 6;
    doc.setFontSize(8);
    doc.text(`${data.COMPANY_NAME} | ${data.COMPANY_ADDRESS} | ${data.COMPANY_PHONE}`, pageWidth / 2, currentY, null, null, 'center');
    
    return doc.output('blob');
  }

  /**
   * Generate PDF using iframe rendering for better styling preservation
   * @param {string} htmlContent - Processed HTML content
   * @param {Object} pdfOptions - PDF options
   * @returns {Blob} PDF blob
   */
  async generatePDFWithIframe(htmlContent, pdfOptions) {
    return new Promise((resolve, reject) => {
      try {
        // Create a complete HTML document
        const fullHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 15mm;
                font-size: 12px;
                line-height: 1.4;
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
          </html>
        `;

        // Create hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        document.body.appendChild(iframe);

        // Write content to iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(fullHTML);
        iframeDoc.close();

        // Wait for content to load
        iframe.onload = () => {
          try {
            // Use jsPDF to convert iframe content to PDF
            const doc = new jsPDF(pdfOptions);
            
            // Add HTML content to PDF with better settings
            doc.html(iframeDoc.body, {
              callback: (doc) => {
                // Clean up
                document.body.removeChild(iframe);
                resolve(doc.output('blob'));
              },
              x: 10,
              y: 10,
              width: 190, // A4 width in mm minus margins
              windowWidth: 800,
              margin: [15, 15, 15, 15],
              autoPaging: 'text'
            });
          } catch (error) {
            document.body.removeChild(iframe);
            reject(error);
          }
        };

        // Handle iframe errors
        iframe.onerror = () => {
          document.body.removeChild(iframe);
          reject(new Error('Failed to load iframe content'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Replace placeholders in HTML template with actual data
   * @param {string} html - HTML template
   * @param {Object} data - Data object
   * @returns {string} Processed HTML
   */
  replacePlaceholders(html, data) {
    let processedHTML = html;

    // Replace all placeholders including ITEMS_TABLE
    for (const [key, value] of Object.entries(data)) {
      // Skip the raw items array (we use ITEMS_TABLE instead)
      if (key === 'items' || key === 'ITEMS') continue;

      // Convert key to uppercase for placeholder matching
      const placeholderKey = key.toUpperCase();
      const placeholder = `{{${placeholderKey}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

      // Replace with value (empty string if null/undefined)
      processedHTML = processedHTML.replace(regex, value !== null && value !== undefined ? value : '');
    }

    return processedHTML;
  }

  /**
   * Download PDF file
   * @param {Blob} pdfBlob - PDF blob
   * @param {string} filename - Filename for download
   */
  downloadPDF(pdfBlob, filename) {
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Print PDF or HTML directly
   * @param {Blob|string} content - PDF blob or HTML string
   */
  async printPDF(content) {
    if (typeof content === 'string') {
      // If content is HTML string, print it directly (better quality)
      const printWindow = window.open('', '_blank');
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      // If content is blob, open as PDF
      const url = URL.createObjectURL(content);
      const printWindow = window.open(url);
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  /**
   * Print HTML directly without converting to PDF
   * @param {string} htmlContent - HTML template with placeholders
   * @param {Object} data - Data to replace placeholders
   */
  async printHTML(htmlContent, data) {
    // Replace placeholders
    const processedHTML = this.replacePlaceholders(htmlContent, data);

    // Open in new window and print
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (printWindow) {
      printWindow.document.write(processedHTML);
      printWindow.document.close();

      // Wait for content to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
  }
}

// Export singleton instance
const pdfGenerationService = new PDFGenerationService();
export default pdfGenerationService;