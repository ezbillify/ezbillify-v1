import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Handlebars from 'handlebars';

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
   * Generate PDF from processed HTML using iframe rendering + html2canvas -> jsPDF
   * This version injects Poppins font link for consistent rendering.
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

        // Check if processedHTML is already a complete HTML document
        const isCompleteHTML = processedHTML.trim().toLowerCase().startsWith('<!doctype') ||
                               processedHTML.trim().toLowerCase().startsWith('<html');

        let fullHTML;
        if (isCompleteHTML) {
          // Template is already a complete HTML document - use as is
          console.log('✅ Using complete HTML template as-is');
          fullHTML = processedHTML;
        } else {
          // Template is HTML fragment - wrap it
          console.log('📦 Wrapping HTML fragment in document structure');
          fullHTML = `
            <!doctype html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
                <style>
                  html, body, * { box-sizing: border-box; }
                  body {
                    margin: 0;
                    padding: 4mm;
                    font-family: 'Poppins', Arial, sans-serif;
                    color: #000;
                    background: #fff;
                  }
                  /* Ensure width for thermal templates */
                  .page {
                    width: ${options.format === '80mm' ? '76mm' : '210mm'};
                  }
                </style>
              </head>
              <body>
                <div class="page">
                  ${processedHTML}
                </div>
              </body>
            </html>
          `;
        }

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(fullHTML);
        iframeDoc.close();

        iframe.onload = () => {
          setTimeout(async () => {
            try {
              // Use dynamic import of html2canvas to keep bundle small
              const html2canvas = (await import('html2canvas')).default;

              const canvas = await html2canvas(iframeDoc.body, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
              });

              // Determine page size for jsPDF
              let pdfFormat = 'a4';
              let pdfOrientation = 'portrait';

              if (options.format === '80mm') {
                // jsPDF supports custom size via array [width, height] in mm
                pdfFormat = [80, (canvas.height * 25.4 / 96)]; // approximate height in mm from px (96dpi)
                pdfOrientation = 'portrait';
              } else if (options.format === '58mm') {
                pdfFormat = [58, (canvas.height * 25.4 / 96)];
                pdfOrientation = 'portrait';
              } else if (String(options.format).toLowerCase() === 'a3') {
                pdfFormat = 'a3';
                pdfOrientation = options.orientation || 'landscape';
              } else if (String(options.format).toLowerCase() === 'a5') {
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

              // Clean up iframe
              document.body.removeChild(iframe);
              resolve(doc.output('blob'));
            } catch (error) {
              document.body.removeChild(iframe);
              reject(error);
            }
          }, 500);
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
   * Print HTML directly without converting to PDF
   */
  async printHTML(htmlContent, data) {
    const processedHTML = this.replacePlaceholders(htmlContent, data);

    // Check if processedHTML is already a complete HTML document
    const isCompleteHTML = processedHTML.trim().toLowerCase().startsWith('<!doctype') ||
                           processedHTML.trim().toLowerCase().startsWith('<html');

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (printWindow) {
      let fullHTML;
      if (isCompleteHTML) {
        // Template is already complete - use as is
        console.log('✅ Printing complete HTML template as-is');
        fullHTML = processedHTML;
      } else {
        // Template is fragment - wrap it
        console.log('📦 Wrapping HTML fragment for printing');
        fullHTML = `
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
              <style>
                body { font-family: 'Poppins', Arial, sans-serif; padding: 8mm; color: #000; background:#fff; }
              </style>
            </head>
            <body>
              ${processedHTML}
            </body>
          </html>
        `;
      }

      printWindow.document.write(fullHTML);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
  }

  /**
   * Replace placeholders in HTML template with actual data using Handlebars
   */
  replacePlaceholders(html, data) {
    try {
      const template = Handlebars.compile(html);
      return template(data);
    } catch (error) {
      console.error('Handlebars template compilation error:', error);
      // Fallback simple replacement
      let processedHTML = html;
      for (const [key, value] of Object.entries(data)) {
        if (key === 'items' || key === 'ITEMS') continue;
        const placeholderKey = key.toUpperCase();
        const placeholder = `{{${placeholderKey}}}`;
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        processedHTML = processedHTML.replace(regex, value !== null && value !== undefined ? value : '');
      }
      return processedHTML;
    }
  }

  /**
   * Download PDF file
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
   */
  async printPDF(content) {
    if (typeof content === 'string') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      const url = URL.createObjectURL(content);
      const printWindow = window.open(url);
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
}

const pdfGenerationService = new PDFGenerationService();
export default pdfGenerationService;
