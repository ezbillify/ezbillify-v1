// components/sales/SalesReturnView.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeftIcon, PrinterIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

const SalesReturnView = ({ companyId, returnId }) => {
  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReturnData();
  }, [companyId, returnId]);

  const fetchReturnData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('sales_documents')
        .select(`
          *,
          branch:branches!sales_documents_branch_id_fkey(name, branch_prefix),
          customer:customers!sales_documents_party_id_fkey(name, phone, email, billing_address, shipping_address),
          items:sales_document_items(*),
          original_invoice:sales_documents!sales_documents_original_document_id_fkey(document_number)
        `)
        .eq('company_id', companyId)
        .eq('id', returnId)
        .single();

      if (error) throw error;
      
      setReturnData(data);
    } catch (err) {
      console.error('Error fetching return data:', err);
      setError('Failed to load return data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800">Return not found</p>
      </div>
    );
  }

  const subtotal = returnData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const totalTax = returnData.items.reduce((sum, item) => sum + item.tax_amount, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{returnData.document_number}</h1>
            <p className="text-slate-600 mt-1">Credit Note</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              returnData.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              returnData.status === 'approved' ? 'bg-green-100 text-green-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {returnData.status.charAt(0).toUpperCase() + returnData.status.slice(1)}
            </span>
            {returnData.branch && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {returnData.branch.branch_prefix}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Return Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Return Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Date:</span>
                <span className="font-medium">{formatDate(returnData.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Original Invoice:</span>
                <span className="font-medium">{returnData.original_invoice?.document_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Reference #:</span>
                <span className="font-medium">{returnData.reference_number || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">{returnData.customer?.name || 'N/A'}</p>
                <p className="text-slate-600">{returnData.customer?.phone || 'N/A'}</p>
                <p className="text-slate-600">{returnData.customer?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-600 font-medium">Billing Address:</p>
                <p className="text-slate-600 whitespace-pre-line">{returnData.customer?.billing_address || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Returned Items</h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Rate</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Tax %</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Tax Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {returnData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{item.description}</div>
                          <div className="text-sm text-slate-500">{item.item_code}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">{item.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">{formatCurrency(item.rate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">{item.tax_rate}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">{formatCurrency(item.tax_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">{formatCurrency(item.quantity * item.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div></div>
          <div></div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Tax:</span>
              <span className="font-medium">{formatCurrency(totalTax)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-lg font-semibold text-slate-900">Total:</span>
              <span className="text-lg font-semibold text-slate-900">{formatCurrency(returnData.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {returnData.notes && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Notes</h3>
            <p className="text-slate-600 whitespace-pre-line">{returnData.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesReturnView;