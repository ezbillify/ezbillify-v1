// src/components/accounting/CashFlowStatement.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../shared/ui/Button';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { exportToExcel, exportToPDF, exportToJSON } from '../shared/utils/exportUtils';

const CashFlowStatement = ({ companyId }) => {
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [cashFlow, setCashFlow] = useState(null);
  const [period, setPeriod] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    to: new Date().toISOString().split('T')[0] // Today
  });

  useEffect(() => {
    console.log('CashFlowStatement component mounted with companyId:', companyId);
    if (companyId) {
      fetchCashFlow();
    }
  }, [companyId, period]);

  const fetchCashFlow = async () => {
    if (!companyId || !period.from || !period.to) {
      console.log('Missing required parameters:', { companyId, period });
      return;
    }
    
    console.log('Fetching cash flow with params:', { companyId, from: period.from, to: period.to });
    
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        from_date: period.from,
        to_date: period.to
      });

      return await authenticatedFetch(`/api/accounting/reports/cash-flow?${params}`);
    };

    const result = await executeRequest(apiCall);
    console.log('Cash flow API result:', result);
    
    if (result.success) {
      setCashFlow(result.data);
    } else {
      showError(result.error || 'Failed to fetch cash flow data');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const handleExport = async (format) => {
    if (!cashFlow) return;

    try {
      const exportData = {
        title: 'Cash Flow Statement',
        period: `From ${period.from} to ${period.to}`,
        data: cashFlow,
        generatedAt: new Date().toISOString()
      };

      switch (format) {
        case 'excel':
          await exportToExcel(exportData, 'cash-flow-statement');
          success('Cash flow statement exported to Excel successfully');
          break;
        case 'pdf':
          await exportToPDF(exportData, 'cash-flow-statement');
          success('Cash flow statement exported to PDF successfully');
          break;
        case 'json':
          await exportToJSON(exportData, 'cash-flow-statement');
          success('Cash flow statement exported to JSON successfully');
          break;
        default:
          showError('Unsupported export format');
      }
    } catch (err) {
      showError('Failed to export cash flow statement: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cash Flow Statement</h1>
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
            onClick={fetchCashFlow}
            disabled={loading}
            icon={loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <div className="relative group">
            <Button
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
            >
              Export
            </Button>
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
          </div>
        </div>
      </div>

      {/* Cash Flow Content */}
      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : !cashFlow ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <FileText className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No data available</h3>
              <p className="text-slate-500 mb-4">Select a period and generate the cash flow statement.</p>
              <Button
                variant="primary"
                onClick={fetchCashFlow}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Generate Cash Flow
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Operating Activities */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Operating Activities</h2>
              <div className="space-y-2">
                {cashFlow.operating.items.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-slate-100">
                    <div>
                      <div className="text-slate-800">{item.description || 'Operating Activity'}</div>
                      {item.reference && (
                        <div className="text-xs text-slate-500">Ref: {item.reference}</div>
                      )}
                      <div className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <span className={item.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(item.net)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                  <span>Net Cash from Operating Activities</span>
                  <span className={cashFlow.operating.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(cashFlow.operating.net)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Investing Activities */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Investing Activities</h2>
              <div className="space-y-2">
                {cashFlow.investing.items.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-slate-100">
                    <div>
                      <div className="text-slate-800">{item.description || 'Investing Activity'}</div>
                      {item.reference && (
                        <div className="text-xs text-slate-500">Ref: {item.reference}</div>
                      )}
                      <div className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <span className={item.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(item.net)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                  <span>Net Cash from Investing Activities</span>
                  <span className={cashFlow.investing.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(cashFlow.investing.net)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Financing Activities */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Financing Activities</h2>
              <div className="space-y-2">
                {cashFlow.financing.items.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-slate-100">
                    <div>
                      <div className="text-slate-800">{item.description || 'Financing Activity'}</div>
                      {item.reference && (
                        <div className="text-xs text-slate-500">Ref: {item.reference}</div>
                      )}
                      <div className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString('en-IN')}</div>
                    </div>
                    <span className={item.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(item.net)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                  <span>Net Cash from Financing Activities</span>
                  <span className={cashFlow.financing.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(cashFlow.financing.net)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Net Increase/Decrease in Cash */}
            <div className="flex justify-between py-3 font-bold text-xl border-t-2 border-slate-300 mt-6">
              <span>Net Increase/(Decrease) in Cash</span>
              <span className={cashFlow.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(cashFlow.summary.netCashFlow)}
              </span>
            </div>
            
            {/* Cash Position */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-slate-600">Opening Balance</div>
                  <div className="text-lg font-semibold">{formatCurrency(cashFlow.summary.openingBalance)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Net Change</div>
                  <div className={cashFlow.summary.netCashFlow >= 0 ? 'text-lg font-semibold text-green-600' : 'text-lg font-semibold text-red-600'}>
                    {formatCurrency(cashFlow.summary.netCashFlow)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Closing Balance</div>
                  <div className="text-lg font-semibold">{formatCurrency(cashFlow.summary.closingBalance)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashFlowStatement;