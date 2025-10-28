// src/components/sales/PrintDebug.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PrintButton from '../shared/print/PrintButton';

const PrintDebug = () => {
  const { company } = useAuth();
  const [testInvoice, setTestInvoice] = useState(null);

  // Create a test invoice with proper company data
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
        name: 'Test Company Pvt Ltd',
        address: {
          address_line1: '123 Business Street',
          address_line2: 'Corporate Complex',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001'
        },
        phone: '+91 98765 43210',
        email: 'info@testcompany.com',
        gstin: '22AAAAA0000A1Z5'
      },
      customer: {
        name: 'Test Customer',
        billing_address: {
          address_line1: '456 Client Avenue',
          address_line2: 'Business District',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001'
        },
        phone: '+91 98765 09876',
        email: 'client@testcustomer.com',
        gstin: '22BBBBB0000B1Y6'
      },
      items: [
        {
          name: 'Product A',
          description: 'High-quality product',
          hsn_sac: '123456',
          quantity: 2,
          unit: 'pcs',
          rate: 4000,
          amount: 8000,
          tax_percentage: 18
        },
        {
          name: 'Product B',
          description: 'Premium product',
          hsn_sac: '789012',
          quantity: 1,
          unit: 'pcs',
          rate: 2000,
          amount: 2000,
          tax_percentage: 18
        }
      ],
      terms_conditions: 'Payment due within 30 days. Late payments may incur interest charges.',
      place_of_supply: 'Maharashtra'
    };
    
    setTestInvoice(invoice);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Print Debug</h1>
      
      {testInvoice ? (
        <div className="space-y-6">
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Test Invoice Data</h2>
            <pre className="text-xs bg-white p-4 rounded border overflow-auto max-h-96">
              {JSON.stringify(testInvoice, null, 2)}
            </pre>
          </div>
          
          <div className="flex gap-4">
            <PrintButton
              documentData={testInvoice}
              documentType="invoice"
              filename={`test-invoice-${testInvoice.document_number}.pdf`}
            />
          </div>
        </div>
      ) : (
        <p>Loading test data...</p>
      )}
    </div>
  );
};

export default PrintDebug;