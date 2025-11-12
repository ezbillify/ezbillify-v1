// src/components/gst/EWayBillList.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import { SearchInput } from '../shared/ui/Input';
import Select from '../shared/ui/Select';
import Badge from '../shared/ui/Badge';
import { useToast } from '../../context/ToastContext';
import { useAPI } from '../../hooks/useAPI';
import gstService from '../../services/gstService';
import { realtimeHelpers } from '../../services/utils/supabase';
import WhitebooksConnectModal from './WhitebooksConnectModal';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  FileText,
  Printer,
  Send,
  FileCheck,
  Truck,
  AlertCircle
} from 'lucide-react';

const EWayBillList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();
  const subscriptionRef = useRef(null);

  // Add credentials state
  const [credentials, setCredentials] = useState(null);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [isWhitebooksModalOpen, setIsWhitebooksModalOpen] = useState(false);
  const [ewayBills, setEwayBills] = useState([]);
  const [selectedEwayBill, setSelectedEwayBill] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all'
  });
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  // Add credentials checking effect
  useEffect(() => {
    const checkCredentials = async () => {
      if (companyId) {
        try {
          const result = await executeRequest(async () => {
            return await authenticatedFetch(`/api/gst/credentials?company_id=${companyId}`);
          });
          
          if (result?.success) {
            setCredentials(result.data);
          }
        } catch (error) {
          console.error('Error checking credentials:', error);
        } finally {
          setCredentialsLoading(false);
        }
      }
    };

    checkCredentials();
  }, [companyId, executeRequest, authenticatedFetch]);

  useEffect(() => {
    if (companyId && credentials) {
      fetchEwayBills();
    }
  }, [companyId, credentials, filters, sortBy, sortOrder, refreshTrigger]);

  const fetchEwayBills = async () => {
    try {
      const params = new URLSearchParams({
        company_id: companyId,
        search: filters.search,
        status: filters.status,
        sort_by: sortBy,
        sort_order: sortOrder,
        _timestamp: Date.now() // Cache busting
      });

      const result = await executeRequest(async () => {
        return await authenticatedFetch(`/api/gst/e-way-bills?${params}`);
      });
      
      if (result?.success) {
        setEwayBills(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching e-way bills:', error);
      showError('Error fetching e-way bills');
    }
  };

  const handleSearchChange = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Function to trigger immediate refresh
  const triggerRefresh = () => {
    setRefreshTrigger(prev => !prev);
  };

  const handleGenerateEwayBill = async (ewayBill) => {
    try {
      const result = await executeRequest(async () => {
        return await authenticatedFetch('/api/gst/e-way-bills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id: companyId,
            invoice_id: ewayBill.id,
            // In a real implementation, you would pass the actual e-way bill data
            eway_bill_data: {
              // Add actual e-way bill data here
            }
          }),
        });
      });

      if (result?.success) {
        success(`e-Way Bill generated successfully for ${ewayBill.invoice_number}`);
        // Update the e-way bill status in the list
        setEwayBills(prev => prev.map(ewb => 
          ewb.id === ewayBill.id 
            ? { ...ewb, status: 'generated' } 
            : ewb
        ));
      } else {
        throw new Error(result?.error || 'Failed to generate e-Way Bill');
      }
    } catch (err) {
      console.error('Error generating e-Way Bill:', err);
      showError('Error generating e-Way Bill: ' + (err.message || 'Unknown error'));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'generated':
        return <Badge variant="success">Generated</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'error':
        return <Badge variant="danger">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return <span className="text-gray-300">↕</span>;
    }
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  // Show loading state while checking credentials
  if (credentialsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add the modal component */}
      <WhitebooksConnectModal 
        isOpen={isWhitebooksModalOpen}
        onClose={() => setIsWhitebooksModalOpen(false)}
        onConnect={() => {
          // Refresh the page or re-check credentials
          window.location.reload();
        }}
      />
      
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">e-Way Bills</h1>
          <p className="text-gray-600 mt-1">Manage your e-Way Bill generation and status</p>
        </div>
        <div className="flex items-center space-x-4">
          {credentials ? (
            <>
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
                onClick={() => setIsWhitebooksModalOpen(true)}
              >
                Reconnect
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsWhitebooksModalOpen(true)}
            >
              Connect Account
            </Button>
          )}
        </div>
      </div>
      
      {/* Connection status message */}
      {!credentials && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">GST Account Not Connected</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Connect your GST account to generate e-Way Bills. You can view existing e-Way Bills below.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-blue-100">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total e-Way Bills</p>
              <p className="text-lg font-semibold">{ewayBills.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-yellow-100">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-lg font-semibold">
                {ewayBills.filter(ewb => ewb.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-100">
              <FileCheck className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Generated</p>
              <p className="text-lg font-semibold">
                {ewayBills.filter(ewb => ewb.status === 'generated').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Errors</p>
              <p className="text-lg font-semibold">
                {ewayBills.filter(ewb => ewb.status === 'error').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Search e-way bills..."
              value={filters.search}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'generated', label: 'Generated' },
                { value: 'error', label: 'Error' }
              ]}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              placeholder="Filter by status"
            />
          </div>
        </div>
      </div>

      {/* e-Way Bills Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortChange('invoice_number')}
                >
                  <div className="flex items-center">
                    Invoice
                    <span className="ml-1">{getSortIcon('invoice_number')}</span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortChange('date')}
                >
                  <div className="flex items-center">
                    Date
                    <span className="ml-1">{getSortIcon('date')}</span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortChange('customer_name')}
                >
                  <div className="flex items-center">
                    Customer
                    <span className="ml-1">{getSortIcon('customer_name')}</span>
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSortChange('total_amount')}
                >
                  <div className="flex items-center">
                    Amount
                    <span className="ml-1">{getSortIcon('total_amount')}</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ewayBills.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No e-way bills found
                  </td>
                </tr>
              ) : (
                ewayBills.map((ewayBill) => (
                  <tr key={ewayBill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ewayBill.invoice_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ewayBill.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ewayBill.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{ewayBill.total_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(ewayBill.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {ewayBill.status === 'pending' && credentials ? (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateEwayBill(ewayBill)}
                          loading={generating && selectedEwayBill === ewayBill.id}
                          disabled={!credentials}
                        >
                          Generate
                        </Button>
                      ) : ewayBill.status === 'generated' ? (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<Eye className="h-4 w-4" />}
                          >
                            View
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                        >
                          Error
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EWayBillList;