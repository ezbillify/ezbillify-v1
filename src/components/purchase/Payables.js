// src/components/purchase/Payables.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import Button from '../shared/ui/Button';
import { ChevronDown, ChevronRight, AlertCircle, TrendingUp, Calendar } from 'lucide-react';

const Payables = ({ companyId }) => {
  const router = useRouter();
  const { error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [vendorPayables, setVendorPayables] = useState([]);
  const [expandedVendor, setExpandedVendor] = useState(null);

  useEffect(() => {
    if (companyId) {
      fetchVendorPayables();
    }
  }, [companyId]);

  const fetchVendorPayables = async () => {
    try {
      // Fetch all vendors with outstanding balance
      const vendorsCall = async () => {
        return await authenticatedFetch(
          `/api/vendors?company_id=${companyId}&is_active=true&limit=1000`
        );
      };

      const vendorsResult = await executeRequest(vendorsCall);
      
      if (!vendorsResult.success) return;

      const vendors = vendorsResult.data || [];
      
      // Filter vendors with outstanding balance
      const vendorsWithDues = vendors.filter(v => parseFloat(v.current_balance || 0) > 0);

      // Fetch bills for each vendor
      const vendorPayablesData = await Promise.all(
        vendorsWithDues.map(async (vendor) => {
          const billsCall = async () => {
            return await authenticatedFetch(
              `/api/purchase/bills?company_id=${companyId}&vendor_id=${vendor.id}&payment_status=unpaid,partially_paid&limit=100&sort_by=due_date&sort_order=asc`
            );
          };

          const billsResult = await executeRequest(billsCall);
          const bills = billsResult.success ? billsResult.data || [] : [];

          // Calculate overdue
          const today = new Date();
          const overdueBills = bills.filter(bill => {
            if (!bill.due_date) return false;
            return new Date(bill.due_date) < today;
          });

          const overdueAmount = overdueBills.reduce((sum, bill) => 
            sum + parseFloat(bill.balance_amount || 0), 0
          );

          return {
            vendor,
            bills,
            totalDue: parseFloat(vendor.current_balance || 0),
            overdueAmount,
            overdueBills: overdueBills.length,
            totalBills: bills.length
          };
        })
      );

      // Sort by total due (descending)
      vendorPayablesData.sort((a, b) => b.totalDue - a.totalDue);

      setVendorPayables(vendorPayablesData);
    } catch (error) {
      console.error('Error fetching vendor payables:', error);
      showError('Failed to load vendor payables');
    }
  };

  const toggleVendor = (vendorId) => {
    setExpandedVendor(expandedVendor === vendorId ? null : vendorId);
  };

  const handlePayNow = (vendorId) => {
    router.push(`/purchase/payments-made/new?vendor_id=${vendorId}`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getOverdueBadgeColor = (days) => {
    if (days === 0) return 'bg-gray-100 text-gray-700';
    if (days <= 7) return 'bg-yellow-100 text-yellow-800';
    if (days <= 30) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-slate-600">Loading payables...</p>
        </div>
      </div>
    );
  }

  if (vendorPayables.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">All Clear!</h3>
          <p className="text-sm text-slate-500">No outstanding payables at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Vendor Payables</h3>
            <p className="text-sm text-slate-500 mt-1">
              {vendorPayables.length} vendor{vendorPayables.length > 1 ? 's' : ''} with outstanding dues
            </p>
          </div>
          
          {/* Summary Stats */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-slate-500">Total Outstanding</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(vendorPayables.reduce((sum, v) => sum + v.totalDue, 0))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Overdue</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(vendorPayables.reduce((sum, v) => sum + v.overdueAmount, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor List */}
      <div className="divide-y divide-slate-200">
        {vendorPayables.map((vendorData) => {
          const isExpanded = expandedVendor === vendorData.vendor.id;
          
          return (
            <div key={vendorData.vendor.id} className="hover:bg-slate-50 transition-colors">
              {/* Vendor Row */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => toggleVendor(vendorData.vendor.id)}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold text-slate-900">
                          {vendorData.vendor.vendor_name}
                        </h4>
                        {vendorData.overdueBills > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3" />
                            {vendorData.overdueBills} overdue
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-slate-500">
                          {vendorData.vendor.vendor_code}
                        </span>
                        <span className="text-sm text-slate-500">
                          {vendorData.totalBills} bill{vendorData.totalBills > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {vendorData.overdueAmount > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Overdue</p>
                        <p className="text-lg font-bold text-orange-600">
                          {formatCurrency(vendorData.overdueAmount)}
                        </p>
                      </div>
                    )}
                    
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Total Due</p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(vendorData.totalDue)}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handlePayNow(vendorData.vendor.id)}
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      }
                    >
                      Pay Now
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Bills Table */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 uppercase">
                            Bill Number
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 uppercase">
                            Bill Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 uppercase">
                            Due Date
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700 uppercase">
                            Bill Amount
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700 uppercase">
                            Paid
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700 uppercase">
                            Balance
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-slate-700 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {vendorData.bills.map((bill) => {
                          const daysOverdue = getDaysOverdue(bill.due_date);
                          const isOverdue = daysOverdue > 0;

                          return (
                            <tr 
                              key={bill.id} 
                              className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50' : ''}`}
                            >
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => router.push(`/purchase/bills/${bill.id}`)}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {bill.document_number}
                                </button>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {formatDate(bill.document_date)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-600">
                                    {formatDate(bill.due_date)}
                                  </span>
                                  {isOverdue && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getOverdueBadgeColor(daysOverdue)}`}>
                                      <Calendar className="w-3 h-3" />
                                      {daysOverdue}d overdue
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                                {formatCurrency(bill.total_amount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                                {formatCurrency(bill.paid_amount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                                {formatCurrency(bill.balance_amount)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                  bill.payment_status === 'paid' 
                                    ? 'bg-green-100 text-green-800'
                                    : bill.payment_status === 'partially_paid'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : isOverdue
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {bill.payment_status === 'partially_paid' ? 'Partial' : bill.payment_status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50">
                        <tr>
                          <td colSpan="5" className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                            Total for {vendorData.vendor.vendor_name}:
                          </td>
                          <td className="px-4 py-3 text-right text-base font-bold text-red-600">
                            {formatCurrency(vendorData.totalDue)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Payables;