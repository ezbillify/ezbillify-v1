// src/components/accounting/reports/inventory/LowStock.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../../../shared/ui/Button';
import { useToast } from '../../../../hooks/useToast';
import { useAPI } from '../../../../hooks/useAPI';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { exportToExcel, exportToPDF, exportToJSON } from '../../../../components/shared/utils/exportUtils';

const LowStockReport = ({ companyId }) => {
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (companyId) {
      fetchReport();
    }
  }, [companyId]);

  const fetchReport = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        report_type: 'low_stock'
      });

      return await authenticatedFetch(`/api/accounting/reports/inventory-reports?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setReportData(result.data);
    }
  };

  const handleExport = async (format) => {
    if (!reportData) return;

    try {
      const exportData = {
        title: 'Low Stock Alert Report',
        data: reportData,
        generatedAt: new Date().toISOString()
      };

      switch (format) {
        case 'excel':
          await exportToExcel(exportData, 'low-stock-report');
          success('Report exported to Excel successfully');
          break;
        case 'pdf':
          await exportToPDF(exportData, 'low-stock-report');
          success('Report exported to PDF successfully');
          break;
        case 'json':
          await exportToJSON(exportData, 'low-stock-report');
          success('Report exported to JSON successfully');
          break;
        default:
          showError('Unsupported export format');
      }
    } catch (err) {
      showError('Failed to export report: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Low Stock Alert Report</h1>
          <p className="text-slate-600 mt-1">
            Products with stock levels below minimum threshold
          </p>
        </div>
        <div className="flex space-x-3">
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
              <p className="text-slate-500 mb-4">Generate the report to see low stock products.</p>
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
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-8">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-sm text-red-600">Total Low Stock Products</div>
                <div className="text-2xl font-bold text-red-800">{reportData.summary.total_low_stock}</div>
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Minimum Stock Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {reportData.products.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-slate-500">
                        No products with low stock levels
                      </td>
                    </tr>
                  ) : (
                    reportData.products.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">{product.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {product.sku || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className="text-red-600">{product.current_stock?.toLocaleString('en-IN') || 0}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {product.min_stock_level?.toLocaleString('en-IN') || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {product.unit || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LowStockReport;