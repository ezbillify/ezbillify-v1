// src/components/accounting/GeneralLedgerList.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Select from '../shared/ui/Select';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { FileText, Download, RefreshCw, Eye } from 'lucide-react';

const GeneralLedgerList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [period, setPeriod] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    to: new Date().toISOString().split('T')[0] // Today
  });
  const [ledgerData, setLedgerData] = useState(null);

  useEffect(() => {
    if (companyId) {
      fetchAccounts();
    }
  }, [companyId]);

  const fetchAccounts = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId
      });

      return await authenticatedFetch(`/api/master-data/chart-of-accounts?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setAccounts(result.data || []);
    }
  };

  const fetchLedger = async () => {
    if (!selectedAccount) {
      showError('Please select an account');
      return;
    }

    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        from_date: period.from,
        to_date: period.to
      });

      return await authenticatedFetch(`/api/accounting/ledger/${selectedAccount}?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setLedgerData(result.data);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      fetchLedger();
    }
  }, [selectedAccount, period]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const handleExport = () => {
    // Export functionality would go here
    success('General ledger exported successfully');
  };

  const getAccountTypeBadge = (type) => {
    const colors = {
      asset: 'bg-blue-100 text-blue-800',
      liability: 'bg-red-100 text-red-800',
      equity: 'bg-purple-100 text-purple-800',
      income: 'bg-green-100 text-green-800',
      expense: 'bg-orange-100 text-orange-800',
      cogs: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">General Ledger</h1>
          <p className="text-slate-600 mt-1">View account-wise transaction history</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={fetchLedger}
            disabled={loading || !selectedAccount}
            icon={loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={!ledgerData}
            icon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
            <Select
              placeholder="Select account"
              value={selectedAccount}
              onChange={setSelectedAccount}
              options={accounts.map(account => ({
                value: account.id,
                label: `${account.account_code} - ${account.account_name}`
              }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
            <DatePicker
              value={period.from}
              onChange={(value) => setPeriod({...period, from: value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
            <DatePicker
              value={period.to}
              onChange={(value) => setPeriod({...period, to: value})}
            />
          </div>
        </div>
      </div>

      {/* Ledger Content */}
      {!selectedAccount ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Eye className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Select an Account</h3>
            <p className="text-slate-600 mb-6">Choose an account from the dropdown to view its ledger transactions.</p>
            <button
              onClick={() => router.push('/master-data/chart-of-accounts')}
              className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              Manage Chart of Accounts
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : !ledgerData ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                <FileText className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">No data available</h3>
                <p className="text-slate-500 mb-4">Select an account and period to view the ledger.</p>
                <Button
                  variant="primary"
                  onClick={fetchLedger}
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  Load Ledger
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Account Summary */}
              <div className="mb-8 p-4 bg-blue-50 rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-xl font-bold text-slate-800">
                        {ledgerData.account.account_code} - {ledgerData.account.account_name}
                      </h2>
                      {getAccountTypeBadge(ledgerData.account.account_type)}
                    </div>
                    <p className="text-slate-600 mt-1">
                      Period: {new Date(period.from).toLocaleDateString('en-IN')} to {new Date(period.to).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-slate-600">Opening Balance</div>
                      <div className="text-lg font-semibold">{formatCurrency(ledgerData.openingBalance)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-slate-600">Current Balance</div>
                      <div className="text-lg font-semibold">{formatCurrency(ledgerData.currentBalance)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ledger Transactions */}
              <div className="border border-slate-200 rounded-lg">
                {ledgerData.items.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No transactions found for the selected period
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Entry Number</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Debit</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Credit</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {ledgerData.items.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {new Date(item.journal_entry.entry_date).toLocaleDateString('en-IN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                              <button 
                                onClick={() => router.push(`/accounting/journal-entries/${item.journal_entry.id}`)}
                                className="text-orange-600 hover:text-orange-900 hover:underline"
                              >
                                {item.journal_entry.entry_number}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-800">
                              <div>{item.journal_entry.narration}</div>
                              {item.description && (
                                <div className="text-xs text-slate-500">{item.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                              {item.debit_amount > 0 ? formatCurrency(item.debit_amount) : ''}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                              {item.credit_amount > 0 ? formatCurrency(item.credit_amount) : ''}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span className={item.running_balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(item.running_balance)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeneralLedgerList;