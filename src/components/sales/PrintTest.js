// src/components/sales/PrintTest.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PrintButton from '../shared/print/PrintButton';

const PrintTest = () => {
  const { company } = useAuth();
  const [testInvoice, setTestInvoice] = useState(null);

  // Create a test invoice
  useEffect(() => {
    const invoice = {
      id: 'test-invoice-1',
      document_number: 'INV-001',
      document_date: '2023-10-27',
      due_date: '2023-11-27',
      total_amount: 11800,
      subtotal: 10000,
      cgst_amount: 900,
      sgst_amount: 900,
      igst_amount: 0,
      company: {
        name: 'Test Company',
        address: '123 Business Street, Corporate City',
        phone: '+91 98765 43210',
        email: 'info@testcompany.com',
        gstin: '22AAAAA0000A1Z5'
      },
      customer: {
        name: 'Test Customer',
        address: '456 Client Avenue, Business District',
        phone: '+91 98765 09876',
        email: 'client@testcustomer.com',
        gstin: '22BBBBB0000B1Y6'
      },
      items: [
        {
          name: 'Product A',
          quantity: 2,
          rate: 4000,
          amount: 8000
        },
        {
          name: 'Product B',
          quantity: 1,
          rate: 2000,
          amount: 2000
        }
      ]
    };
    
    setTestInvoice(invoice);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Print Test</h1>
      
      {testInvoice ? (
        <div>
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Test Invoice Data</h2>
            <p><strong>Document #:</strong> {testInvoice.document_number}</p>
            <p><strong>Total Amount:</strong> ₹{testInvoice.total_amount}</p>
            <p><strong>Company:</strong> {testInvoice.company?.name}</p>
            <p><strong>Customer:</strong> {testInvoice.customer?.name}</p>
          </div>
          
          <PrintButton
            documentData={testInvoice}
            documentType="invoice"
            filename={`test-invoice-${testInvoice.document_number}.pdf`}
          />
        </div>
      ) : (
        <p>Loading test data...</p>
      )}
    </div>
  );
};

export default PrintTest;