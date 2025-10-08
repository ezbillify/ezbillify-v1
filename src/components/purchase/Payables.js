// src/components/purchase/Payables.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import { SearchInput } from '../shared/ui/Input';
import Badge from '../shared/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';

const Payables = ({ companyId }) => {
  const router = useRouter();
  const { executeRequest, authenticatedFetch } = useAPI();

  const [vendorPayables, setVendorPayables] = useState([]);
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [vendorBills, setVendorBills] = useState({});
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({
    total_payables: 0,
    overdue_payables: 0,
    total_vendors: 0
  });

  useEffect(() => {
    if (companyId) {
      fetchVendorPayables();
      fetchSummary();
    }
  }, [companyId, search]);

  const fetchSummary = async () => {
    const apiCall = async () => {
      return await authenticatedFetch(`/api/purchase/payments-made/summary?company_id=${companyId}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success && result.data) {
      setSummary(result.data);
    }
  };

  const fetchVendorPayables = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        is_active: true,
        has_balance: true
      });

      if (search) {
        params.append('search', search);
      }

      return await authenticatedFetch(`/api/vendors?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      const vendors = result.data || [];
      // Filter vendors with balance > 0
      const vendorsWithBalance = vendors.filter(v => parseFloat(v.current_balance || 0) > 0);
      setVendorPayables(vendorsWithBalance);
    }
  };

  const fetchVendorBills = async (vendorId) => {
    if (vendorBills[vendorId]) {
      setExpandedVendor(expandedVendor === vendorId ? null : vendorId);
      return;
    }

    const apiCall = async () => {
      return await authenticatedFetch(
        `/api/purchase/bills?company_id=${companyId}&vendor_id=${vendorId}&payment_status=unpaid,partially_paid`
      );
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setVendorBills(prev => ({
        ...prev,
        [vendorId]: result.data || []
      }));
      setExpandedVendor(vendorId);
    }
  };

  const handleMakePayment = (vendorId) => {
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

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payables (Accounts Payable)</h1>
          <p className="text-slate-600 mt-1">Vendor-wise outstanding payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Payables</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(summary.total_payables)}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Overdue</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {formatCurrency(summary.overdue_payables)}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Vendors with Dues</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {summary.total_vendors}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <SearchInput
          placeholder="Search vendors by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Vendor Payables List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {vendorPayables.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-slate-900">No outstanding payables</h3>
            <p className="mt-1 text-sm text-slate-500">All vendor bills are paid!</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            {vendorPayables.map((vendor) => (
              <div key={vendor.id} className="border-b border-slate-200 last:border-b-0">
                {/* Vendor Header */}
                <div className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <button
                        onClick={() => fetchVendorBills(vendor.id)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <svg
                          className={`w-5 h-5 transform transition-transform ${
                            expandedVendor === vendor.id ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {vendor.vendor_name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-slate-500">{vendor.vendor_code}</span>
                          {vendor.gstin && (
                            <span className="text-sm text-slate-500">GSTIN: {vendor.gstin}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Outstanding Balance</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(vendor.current_balance)}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleMakePayment(vendor.id)}
                        icon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        }
                      >
                        Make Payment
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Bills */}
                {expandedVendor === vendor.id && vendorBills[vendor.id] && (
                  <div className="bg-slate-50 px-6 py-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Unpaid Bills</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-white">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                              Bill Number
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                              Bill Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                              Due Date
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                              Bill Amount
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                              Paid
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                              Balance
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {vendorBills[vendor.id].map((bill) => (
                            <tr key={bill.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                {bill.document_number}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {formatDate(bill.document_date)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={isOverdue(bill.due_date) ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                                  {formatDate(bill.due_date)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-slate-900">
                                {formatCurrency(bill.total_amount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-green-600">
                                {formatCurrency(bill.paid_amount)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                                {formatCurrency(bill.balance_amount)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isOverdue(bill.due_date) ? (
                                  <Badge variant="error">Overdue</Badge>
                                ) : bill.payment_status === 'partially_paid' ? (
                                  <Badge variant="warning">Partial</Badge>
                                ) : (
                                  <Badge variant="default">Unpaid</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Payables;