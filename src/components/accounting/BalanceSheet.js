// src/components/accounting/BalanceSheet.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../shared/ui/Button';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { exportToExcel, exportToPDF, exportToJSON } from '../shared/utils/exportUtils';

const BalanceSheetReport = ({ companyId }) => {
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [balanceSheet, setBalanceSheet] = useState(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (companyId) {
      fetchBalanceSheet();
    }
  }, [companyId, asOfDate]);

  const fetchBalanceSheet = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        as_of_date: asOfDate
      });

      return await authenticatedFetch(`/api/accounting/reports/balance-sheet?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setBalanceSheet(result.data);
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
    if (!balanceSheet) return;

    try {
      const exportData = {
        title: 'Balance Sheet',
        period: `As of ${asOfDate}`,
        data: balanceSheet,
        generatedAt: new Date().toISOString()
      };

      switch (format) {
        case 'excel':
          await exportToExcel(exportData, 'balance-sheet');
          success('Balance sheet exported to Excel successfully');
          break;
        case 'pdf':
          await exportToPDF(exportData, 'balance-sheet');
          success('Balance sheet exported to PDF successfully');
          break;
        case 'json':
          await exportToJSON(exportData, 'balance-sheet');
          success('Balance sheet exported to JSON successfully');
          break;
        default:
          showError('Unsupported export format');
      }
    } catch (err) {
      showError('Failed to export balance sheet: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Balance Sheet</h1>
          <p className="text-slate-600 mt-1">As of {new Date(asOfDate).toLocaleDateString('en-IN')}</p>
        </div>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">As of Date:</span>
            <DatePicker
              value={asOfDate}
              onChange={setAsOfDate}
            />
          </div>
          <Button
            variant="secondary"
            onClick={fetchBalanceSheet}
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

      {/* Balance Sheet Content */}
      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : !balanceSheet ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <FileText className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No data available</h3>
              <p className="text-slate-500 mb-4">Select a date and generate the balance sheet.</p>
              <Button
                variant="primary"
                onClick={fetchBalanceSheet}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Generate Balance Sheet
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Assets Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Assets</h2>
              
              {/* Current Assets */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-3">Current Assets</h3>
                <div className="space-y-2">
                  {balanceSheet.assets.current.map((account) => (
                    <div key={account.id} className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">{account.account_name}</span>
                      <span className="text-slate-800">{formatCurrency(account.current_balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                    <span>Total Current Assets</span>
                    <span>{formatCurrency(balanceSheet.assets.totals.current)}</span>
                  </div>
                </div>
              </div>
              
              {/* Fixed Assets */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-3">Fixed Assets</h3>
                <div className="space-y-2">
                  {balanceSheet.assets.fixed.map((account) => (
                    <div key={account.id} className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">{account.account_name}</span>
                      <span className="text-slate-800">{formatCurrency(account.current_balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                    <span>Total Fixed Assets</span>
                    <span>{formatCurrency(balanceSheet.assets.totals.fixed)}</span>
                  </div>
                </div>
              </div>
              
              {/* Other Assets */}
              {balanceSheet.assets.other.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-3">Other Assets</h3>
                  <div className="space-y-2">
                    {balanceSheet.assets.other.map((account) => (
                      <div key={account.id} className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">{account.account_name}</span>
                        <span className="text-slate-800">{formatCurrency(account.current_balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                      <span>Total Other Assets</span>
                      <span>{formatCurrency(balanceSheet.assets.totals.other)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-slate-300 mt-4">
                <span>Total Assets</span>
                <span>{formatCurrency(balanceSheet.totals.assets)}</span>
              </div>
            </div>
            
            {/* Liabilities and Equity Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Liabilities */}
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Liabilities</h2>
                
                {/* Current Liabilities */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-3">Current Liabilities</h3>
                  <div className="space-y-2">
                    {balanceSheet.liabilities.current.map((account) => (
                      <div key={account.id} className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">{account.account_name}</span>
                        <span className="text-slate-800">{formatCurrency(account.current_balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                      <span>Total Current Liabilities</span>
                      <span>{formatCurrency(balanceSheet.liabilities.totals.current)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Long Term Liabilities */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-3">Long Term Liabilities</h3>
                  <div className="space-y-2">
                    {balanceSheet.liabilities.longTerm.map((account) => (
                      <div key={account.id} className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">{account.account_name}</span>
                        <span className="text-slate-800">{formatCurrency(account.current_balance)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                      <span>Total Long Term Liabilities</span>
                      <span>{formatCurrency(balanceSheet.liabilities.totals.longTerm)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Other Liabilities */}
                {balanceSheet.liabilities.other.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-3">Other Liabilities</h3>
                    <div className="space-y-2">
                      {balanceSheet.liabilities.other.map((account) => (
                        <div key={account.id} className="flex justify-between py-2 border-b border-slate-100">
                          <span className="text-slate-600">{account.account_name}</span>
                          <span className="text-slate-800">{formatCurrency(account.current_balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                        <span>Total Other Liabilities</span>
                        <span>{formatCurrency(balanceSheet.liabilities.totals.other)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-slate-300 mt-4">
                  <span>Total Liabilities</span>
                  <span>{formatCurrency(balanceSheet.totals.liabilities)}</span>
                </div>
              </div>
              
              {/* Equity */}
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Equity</h2>
                <div className="space-y-2">
                  {balanceSheet.equity.items.map((account) => (
                    <div key={account.id} className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">{account.account_name}</span>
                      <span className="text-slate-800">{formatCurrency(account.current_balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-slate-300 mt-4">
                    <span>Total Equity</span>
                    <span>{formatCurrency(balanceSheet.totals.equity)}</span>
                  </div>
                </div>
                
                <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-slate-300 mt-6">
                  <span>Total Liabilities & Equity</span>
                  <span>{formatCurrency(balanceSheet.totals.liabilitiesAndEquity)}</span>
                </div>
                
                {balanceSheet.isBalanced ? (
                  <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg text-center">
                    Balance sheet is balanced
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg text-center">
                    Balance sheet is not balanced (Difference: {formatCurrency(Math.abs(balanceSheet.totals.assets - balanceSheet.totals.liabilitiesAndEquity))})
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceSheetReport;