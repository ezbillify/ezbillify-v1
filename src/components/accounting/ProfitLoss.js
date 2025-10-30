// src/components/accounting/ProfitLoss.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../shared/ui/Button';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { exportToExcel, exportToPDF, exportToJSON } from '../shared/utils/exportUtils';

const ProfitLossReport = ({ companyId }) => {
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [profitLoss, setProfitLoss] = useState(null);
  const [period, setPeriod] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    to: new Date().toISOString().split('T')[0] // Today
  });

  useEffect(() => {
    if (companyId) {
      fetchProfitLoss();
    }
  }, [companyId, period]);

  const fetchProfitLoss = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        from_date: period.from,
        to_date: period.to
      });

      return await authenticatedFetch(`/api/accounting/reports/profit-loss?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setProfitLoss(result.data);
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
    if (!profitLoss) return;

    try {
      const exportData = {
        title: 'Profit & Loss Statement',
        period: `From ${period.from} to ${period.to}`,
        data: profitLoss,
        generatedAt: new Date().toISOString()
      };

      switch (format) {
        case 'excel':
          await exportToExcel(exportData, 'profit-loss-statement');
          success('Profit & Loss exported to Excel successfully');
          break;
        case 'pdf':
          await exportToPDF(exportData, 'profit-loss-statement');
          success('Profit & Loss exported to PDF successfully');
          break;
        case 'json':
          await exportToJSON(exportData, 'profit-loss-statement');
          success('Profit & Loss exported to JSON successfully');
          break;
        default:
          showError('Unsupported export format');
      }
    } catch (err) {
      showError('Failed to export Profit & Loss: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Profit & Loss Statement</h1>
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
            onClick={fetchProfitLoss}
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

      {/* Profit & Loss Content */}
      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : !profitLoss ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <FileText className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No data available</h3>
              <p className="text-slate-500 mb-4">Select a period and generate the profit & loss statement.</p>
              <Button
                variant="primary"
                onClick={fetchProfitLoss}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Generate Profit & Loss
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Income Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Income</h2>
              <div className="space-y-2">
                {profitLoss.income.accounts.map((account) => (
                  <div key={account.id} className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">{account.account_name}</span>
                    <span className="text-slate-800">{formatCurrency(account.period_balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                  <span>Total Income</span>
                  <span>{formatCurrency(profitLoss.income.total)}</span>
                </div>
              </div>
            </div>
            
            {/* Cost of Goods Sold */}
            {profitLoss.cogs.accounts.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Cost of Goods Sold</h2>
                <div className="space-y-2">
                  {profitLoss.cogs.accounts.map((account) => (
                    <div key={account.id} className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">{account.account_name}</span>
                      <span className="text-slate-800">{formatCurrency(account.period_balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                    <span>Total COGS</span>
                    <span>{formatCurrency(profitLoss.cogs.total)}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Gross Profit */}
            <div className="flex justify-between py-3 font-bold text-lg border-t-2 border-slate-300 mt-4 mb-8">
              <span>Gross Profit</span>
              <span>{formatCurrency(profitLoss.grossProfit)}</span>
            </div>
            
            {/* Expenses Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Expenses</h2>
              <div className="space-y-2">
                {profitLoss.expenses.accounts.map((account) => (
                  <div key={account.id} className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">{account.account_name}</span>
                    <span className="text-slate-800">{formatCurrency(account.period_balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-semibold border-t border-slate-300 mt-2">
                  <span>Total Expenses</span>
                  <span>{formatCurrency(profitLoss.expenses.total)}</span>
                </div>
              </div>
            </div>
            
            {/* Net Profit */}
            <div className="flex justify-between py-3 font-bold text-xl border-t-2 border-slate-300 mt-6">
              <span>Net Profit</span>
              <span className={profitLoss.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(profitLoss.netProfit)}
              </span>
            </div>
            
            {/* Profit Margin */}
            {profitLoss.netProfitMargin !== undefined && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-slate-700">Net Profit Margin</span>
                  <span className={profitLoss.netProfitMargin >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {profitLoss.netProfitMargin.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitLossReport;