// src/components/accounting/reports/sales/BillWiseSales.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../../../shared/ui/Button';
import DatePicker from '../../../shared/calendar/DatePicker';
import { useToast } from '../../../../hooks/useToast';
import { useAPI } from '../../../../hooks/useAPI';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { exportToExcel, exportToPDF, exportToJSON } from '../../../../components/shared/utils/exportUtils';

const BillWiseSalesReport = ({ companyId }) => {
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [reportData, setReportData] = useState(null);
  const [period, setPeriod] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Start of current month
    to: new Date().toISOString().split('T')[0] // Today
  });

  useEffect(() => {
    if (companyId) {
      fetchReport();
    }
  }, [companyId, period]);

  const fetchReport = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        from_date: period.from,
        to_date: period.to,
        report_type: 'bill_wise'
      });

      return await authenticatedFetch(`/api/accounting/reports/sales-reports?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setReportData(result.data);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const handleExport = async (format) => {
    if (!reportData) return;

    try {
      const exportData = {
        title: 'Bill-wise Sales Report',
        period: `From ${period.from} to ${period.to}`,
        data: reportData,
        generatedAt: new Date().toISOString()
      };

      switch (format) {
        case 'excel':
          await exportToExcel(exportData, 'bill-wise-sales-report');
          success('Report exported to Excel successfully');
          break;
        case 'pdf':
          await exportToPDF(exportData, 'bill-wise-sales-report');
          success('Report exported to PDF successfully');
          break;
        case 'json':
          await exportToJSON(exportData, 'bill-wise-sales-report');
          success('Report exported to JSON successfully');
          break;
        default:
          showError('Unsupported export format');
      }
    } catch (err) {
      showError('Failed to export report: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Paid</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case 'overdue':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Overdue</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bill-wise Sales Report</h1>
          <p className="text-slate-600 mt-1">
            {period.from && period.to 
              ? `From ${new Date(period.from).toLocaleDateString('en-IN')} to ${new Date(period.to).toLocaleDateString('en-IN')}`
              : 'Select a period'}
          </p>
        </div>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">From:</span>
            <DatePicker
              value={period.from}
              onChange={(value) => setPeriod({...period, from: value})}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">To:</span>
            <DatePicker
              value={period.to}
              onChange={(value) => setPeriod({...period, to: value})}
            />
          </div>
          <Button
            variant="secondary"
            onClick={fetchReport}
            disabled={loading}
            icon={loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <div className="relative group">
            <Button
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
              disabled={!reportData}
            >
              Export
            </Button>
            {reportData && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                <button
                  onClick={() => handleExport('excel')}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Export to Excel
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Export to PDF
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Export to JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : !reportData ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <FileText className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No data available</h3>
              <p className="text-slate-500 mb-4">Select a period and generate the report.</p>
              <Button
                variant="primary"
                onClick={fetchReport}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Generate Report
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Total Invoices</div>
                <div className="text-2xl font-bold text-slate-800">{reportData.summary.total_invoices}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Total Amount</div>
                <div className="text-2xl font-bold text-slate-800">{formatCurrency(reportData.summary.total_amount)}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Total Tax</div>
                <div className="text-2xl font-bold text-slate-800">{formatCurrency(reportData.summary.total_tax)}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600">Grand Total</div>
                <div className="text-2xl font-bold text-slate-800">{formatCurrency(reportData.summary.total_grand)}</div>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tax Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Grand Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {reportData.invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{invoice.invoice_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {invoice.customer?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatCurrency(invoice.tax_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={invoice.grand_total >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(invoice.grand_total)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(invoice.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td className="px-6 py-3 text-sm text-slate-900">Totals</td>
                    <td className="px-6 py-3 text-sm text-slate-900"></td>
                    <td className="px-6 py-3 text-sm text-slate-900"></td>
                    <td className="px-6 py-3 text-sm text-slate-900">{formatCurrency(reportData.summary.total_amount)}</td>
                    <td className="px-6 py-3 text-sm text-slate-900">{formatCurrency(reportData.summary.total_tax)}</td>
                    <td className="px-6 py-3 text-sm text-slate-900">{formatCurrency(reportData.summary.total_grand)}</td>
                    <td className="px-6 py-3 text-sm text-slate-900"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillWiseSalesReport;