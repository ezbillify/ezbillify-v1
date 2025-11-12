// src/pages/gst-integration/einvoice.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/shared/ui/Button';
import Card from '../../components/shared/ui/Card';
import Input from '../../components/shared/ui/Input';
import Select from '../../components/shared/ui/Select';
import { useToast } from '../../context/ToastContext';
import gstService from '../../services/gstService';

const EInvoicePage = () => {
  const router = useRouter();
  const { company } = useAuth();
  const { success, error: showError } = useToast();
  
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchCredentials();
    fetchInvoices();
  }, [company?.id]);

  const fetchCredentials = async () => {
    if (!company?.id) return;
    
    try {
      const result = await gstService.getCredentials(company.id);
      if (result.success) {
        setCredentials(result.data);
      } else {
        showError('Failed to fetch GST credentials');
      }
    } catch (err) {
      console.error('Error fetching credentials:', err);
      showError('Error fetching GST credentials');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    if (!company?.id) return;
    
    try {
      // In a real implementation, you would fetch actual invoices from your database
      // that are eligible for e-invoicing
      const mockInvoices = [
        {
          id: '1',
          invoice_number: 'INV-001',
          date: '2023-06-15',
          customer_name: 'ABC Corporation',
          total_amount: 50000,
          status: 'pending'
        },
        {
          id: '2',
          invoice_number: 'INV-002',
          date: '2023-06-16',
          customer_name: 'XYZ Ltd',
          total_amount: 75000,
          status: 'pending'
        },
        {
          id: '3',
          invoice_number: 'INV-003',
          date: '2023-06-17',
          customer_name: 'PQR Industries',
          total_amount: 30000,
          status: 'generated'
        }
      ];
      
      setInvoices(mockInvoices);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      showError('Error fetching invoices');
    }
  };

  const handleGenerateEInvoice = async (invoice) => {
    if (!credentials) {
      showError('Please connect your GST account first');
      return;
    }
    
    setGenerating(true);
    setSelectedInvoice(invoice.id);
    
    try {
      // Mock invoice data for Whitebooks API
      const invoiceData = {
        document_type: 'INV',
        document_number: invoice.invoice_number,
        document_date: invoice.date,
        // Add more fields as required by Whitebooks API
      };
      
      const result = await gstService.generateEInvoice(credentials, invoiceData);
      
      if (result.success) {
        success(`e-Invoice generated successfully for ${invoice.invoice_number}`);
        // Update the invoice status in the list
        setInvoices(prev => prev.map(inv => 
          inv.id === invoice.id 
            ? { ...inv, status: 'generated', irn: result.data.irn } 
            : inv
        ));
      } else {
        showError(result.error || 'Failed to generate e-Invoice');
      }
    } catch (err) {
      console.error('Error generating e-Invoice:', err);
      showError('Error generating e-Invoice');
    } finally {
      setGenerating(false);
      setSelectedInvoice(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading e-Invoice dashboard...</p>
        </div>
      </div>
    );
  }

  if (!credentials) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">e-Invoice</h1>
              <p className="text-gray-600 mt-2">Generate IRN and QR codes for B2B invoices</p>
            </div>
          </div>
          
          <Card className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">GST Account Not Connected</h3>
            <p className="mt-2 text-gray-500">Connect your GST account to start generating e-Invoices</p>
            <div className="mt-6">
              <Button
                onClick={() => router.push('/gst-integration/dashboard')}
              >
                Connect GST Account
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">e-Invoice</h1>
            <p className="text-gray-600 mt-2">Generate IRN and QR codes for B2B invoices</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-500">Connected to:</span>
              <span className="font-medium ml-2">{credentials.gstin}</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                credentials.is_sandbox 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {credentials.is_sandbox ? 'Sandbox' : 'Production'}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/gst-integration/dashboard')}
            >
              Settings
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Invoices</h3>
                <p className="text-2xl font-semibold">{invoices.length}</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Pending</h3>
                <p className="text-2xl font-semibold">
                  {invoices.filter(inv => inv.status === 'pending').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Generated</h3>
                <p className="text-2xl font-semibold">
                  {invoices.filter(inv => inv.status === 'generated').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Errors</h3>
                <p className="text-2xl font-semibold">
                  {invoices.filter(inv => inv.status === 'error').length}
                </p>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Invoices Table */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Invoices</h2>
            <div className="flex space-x-3">
              <Input
                placeholder="Search invoices..."
                className="text-sm"
                size="sm"
              />
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'generated', label: 'Generated' },
                  { value: 'error', label: 'Error' }
                ]}
                className="text-sm"
                size="sm"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{invoice.total_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        invoice.status === 'generated' 
                          ? 'bg-green-100 text-green-800' 
                          : invoice.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {invoice.status === 'pending' ? (
                        <Button
                          size="sm"
                          loading={generating && selectedInvoice === invoice.id}
                          onClick={() => handleGenerateEInvoice(invoice)}
                        >
                          Generate
                        </Button>
                      ) : invoice.status === 'generated' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // View e-Invoice details
                          }}
                        >
                          View
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            // Retry generation
                          }}
                        >
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EInvoicePage;