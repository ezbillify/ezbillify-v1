// src/components/shared/utils/exportUtils.js
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Export to Excel
export const exportToExcel = async (data, filename) => {
  try {
    // Create worksheet data
    const worksheetData = [];
    
    // Add title and period
    worksheetData.push(['Report:', data.title]);
    if (data.period) {
      worksheetData.push(['Period:', data.period]);
    }
    worksheetData.push(['Generated:', new Date(data.generatedAt).toLocaleString('en-IN')]);
    worksheetData.push([]); // Empty row
    
    // Add summary data
    if (data.data?.summary) {
      worksheetData.push(['SUMMARY']);
      Object.entries(data.data.summary).forEach(([key, value]) => {
        worksheetData.push([key, typeof value === 'number' ? value.toLocaleString('en-IN') : value]);
      });
      worksheetData.push([]); // Empty row
    }
    
    // Add main data headers and rows
    if (data.data?.customers) {
      worksheetData.push(['Customer', 'Invoices', 'Total Amount', 'Tax Amount', 'Grand Total']);
      data.data.customers.forEach(customer => {
        worksheetData.push([
          customer.customer_name,
          customer.invoices.length,
          customer.total_amount,
          customer.tax_amount,
          customer.grand_total
        ]);
      });
    } else if (data.data?.invoices) {
      worksheetData.push(['Invoice Number', 'Date', 'Customer', 'Total Amount', 'Tax Amount', 'Grand Total', 'Status']);
      data.data.invoices.forEach(invoice => {
        worksheetData.push([
          invoice.invoice_number,
          invoice.invoice_date,
          invoice.customer?.name || 'N/A',
          invoice.total_amount,
          invoice.tax_amount,
          invoice.grand_total,
          invoice.status
        ]);
      });
    } else if (data.data?.products) {
      worksheetData.push(['Product', 'Quantity', 'Amount']);
      data.data.products.forEach(product => {
        worksheetData.push([
          product.product_name,
          product.total_quantity,
          product.total_amount
        ]);
      });
    }
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    
    // Export to Excel file
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    throw new Error('Failed to export to Excel: ' + error.message);
  }
};

// Export to PDF
export const exportToPDF = async (data, filename) => {
  try {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(data.title, 105, 20, null, null, 'center');
    
    // Add period
    doc.setFontSize(12);
    if (data.period) {
      doc.text(`Period: ${data.period}`, 105, 30, null, null, 'center');
    }
    doc.text(`Generated: ${new Date(data.generatedAt).toLocaleString('en-IN')}`, 105, 40, null, null, 'center');
    
    // Add content (simplified text version)
    let yPos = 60;
    doc.setFontSize(14);
    
    // Add summary
    if (data.data?.summary) {
      doc.text('Summary:', 20, yPos);
      yPos += 10;
      doc.setFontSize(12);
      Object.entries(data.data.summary).forEach(([key, value]) => {
        doc.text(`${key}: ${typeof value === 'number' ? value.toLocaleString('en-IN') : value}`, 25, yPos);
        yPos += 7;
      });
      yPos += 10;
    }
    
    // Add data (simplified)
    doc.setFontSize(14);
    if (data.data?.customers) {
      doc.text('Customer-wise Data:', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text('Customer | Invoices | Total | Tax | Grand Total', 20, yPos);
      yPos += 7;
      data.data.customers.slice(0, 20).forEach(customer => { // Limit to 20 rows
        const rowText = `${customer.customer_name} | ${customer.invoices.length} | ${customer.total_amount.toLocaleString('en-IN')} | ${customer.tax_amount.toLocaleString('en-IN')} | ${customer.grand_total.toLocaleString('en-IN')}`;
        doc.text(rowText, 20, yPos);
        yPos += 7;
        if (yPos > 280) { // Add new page if needed
          doc.addPage();
          yPos = 20;
        }
      });
    } else if (data.data?.invoices) {
      doc.text('Invoice Data:', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text('Invoice # | Date | Customer | Total | Tax | Grand Total | Status', 20, yPos);
      yPos += 7;
      data.data.invoices.slice(0, 20).forEach(invoice => { // Limit to 20 rows
        const rowText = `${invoice.invoice_number} | ${invoice.invoice_date} | ${invoice.customer?.name || 'N/A'} | ${invoice.total_amount.toLocaleString('en-IN')} | ${invoice.tax_amount.toLocaleString('en-IN')} | ${invoice.grand_total.toLocaleString('en-IN')} | ${invoice.status}`;
        doc.text(rowText, 20, yPos);
        yPos += 7;
        if (yPos > 280) { // Add new page if needed
          doc.addPage();
          yPos = 20;
        }
      });
    } else if (data.data?.products) {
      doc.text('Product Data:', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text('Product | Quantity | Amount', 20, yPos);
      yPos += 7;
      data.data.products.slice(0, 20).forEach(product => { // Limit to 20 rows
        const rowText = `${product.product_name} | ${product.total_quantity.toLocaleString('en-IN')} | ${product.total_amount.toLocaleString('en-IN')}`;
        doc.text(rowText, 20, yPos);
        yPos += 7;
        if (yPos > 280) { // Add new page if needed
          doc.addPage();
          yPos = 20;
        }
      });
    }
    
    // Save PDF
    doc.save(`${filename}.pdf`);
  } catch (error) {
    throw new Error('Failed to export to PDF: ' + error.message);
  }
};

// Export to JSON
export const exportToJSON = async (data, filename) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    throw new Error('Failed to export to JSON: ' + error.message);
  }
};