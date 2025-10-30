// src/components/accounting/TrialBalanceList.js
'use client';

import { useState, useEffect } from 'react';
import Button from '../shared/ui/Button';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { FileText, Download, RefreshCw } from 'lucide-react';

const TrialBalanceList = ({ companyId }) => {
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [trialBalance, setTrialBalance] = useState([]);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (companyId) {
      fetchTrialBalance();
    }
  }, [companyId, asOfDate]);

  const fetchTrialBalance = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        as_of_date: asOfDate
      });

      return await authenticatedFetch(`/api/accounting/ledger/trial-balance?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setTrialBalance(result.data?.accounts || []);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;

    trialBalance.forEach(account => {
      totalDebit += account.debit || 0;
      totalCredit += account.credit || 0;
    });

    return { totalDebit, totalCredit, difference: Math.abs(totalDebit - totalCredit) };
  };

  const totals = calculateTotals();

  const handleExport = () => {
    // Export functionality would go here
    success('Trial balance exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Trial Balance</h1>
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
            onClick={fetchTrialBalance}
            disabled={loading}
            icon={loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={handleExport}
            icon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Account Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Account Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Debit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Credit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    </div>
                  </td>
                </tr>
              ) : trialBalance.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-slate-300 mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-1">No data available</h3>
                      <p className="text-slate-500 mb-4">Select a date and generate the trial balance.</p>
                      <Button
                        variant="primary"
                        onClick={fetchTrialBalance}
                        icon={<RefreshCw className="w-4 h-4" />}
                      >
                        Generate Trial Balance
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {trialBalance.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {account.account_code}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {account.account_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {account.debit > 0 ? formatCurrency(account.debit) : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {account.credit > 0 ? formatCurrency(account.credit) : ''}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900" colSpan="2">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatCurrency(totals.totalDebit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatCurrency(totals.totalCredit)}
                    </td>
                  </tr>
                  {totals.difference > 0 && (
                    <tr className="bg-red-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-900" colSpan="4">
                        <div className="flex justify-between">
                          <span>Difference:</span>
                          <span>{formatCurrency(totals.difference)}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrialBalanceList;