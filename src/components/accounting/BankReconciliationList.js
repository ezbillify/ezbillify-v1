// src/components/accounting/BankReconciliationList.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../shared/ui/Button';
import Select from '../shared/ui/Select';
import DatePicker from '../shared/calendar/DatePicker';
import { useToast } from '../../hooks/useToast';
import { useAPI } from '../../hooks/useAPI';
import { FileText, Download, RefreshCw, CheckCircle } from 'lucide-react';

const BankReconciliationList = ({ companyId }) => {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { loading, executeRequest, authenticatedFetch } = useAPI();

  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);
  const [reconciliationData, setReconciliationData] = useState(null);

  useEffect(() => {
    if (companyId) {
      fetchBankAccounts();
    }
  }, [companyId]);

  const fetchBankAccounts = async () => {
    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId
      });

      return await authenticatedFetch(`/api/accounting/bank-accounts?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setBankAccounts(result.data || []);
      if (result.data && result.data.length > 0) {
        setSelectedBankAccount(result.data[0].id);
      }
    }
  };

  const fetchReconciliation = async () => {
    if (!selectedBankAccount) {
      showError('Please select a bank account');
      return;
    }

    const apiCall = async () => {
      const params = new URLSearchParams({
        company_id: companyId,
        statement_date: statementDate
      });

      return await authenticatedFetch(`/api/accounting/reconciliation/${selectedBankAccount}?${params}`);
    };

    const result = await executeRequest(apiCall);
    if (result.success) {
      setReconciliationData(result.data);
    }
  };

  useEffect(() => {
    if (selectedBankAccount) {
      fetchReconciliation();
    }
  }, [selectedBankAccount, statementDate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const handleExport = () => {
    // Export functionality would go here
    success('Bank reconciliation exported successfully');
  };

  const selectedAccount = bankAccounts.find(account => account.id === selectedBankAccount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bank Reconciliation</h1>
          <p className="text-slate-600 mt-1">Reconcile bank statements with accounting records</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={fetchReconciliation}
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account</label>
            <Select
              placeholder="Select bank account"
              value={selectedBankAccount}
              onChange={setSelectedBankAccount}
              options={bankAccounts.map(account => ({
                value: account.id,
                label: `${account.account_name} (${account.account_number})`
              }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Statement Date</label>
            <DatePicker
              value={statementDate}
              onChange={setStatementDate}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="primary"
              onClick={fetchReconciliation}
              disabled={loading || !selectedBankAccount}
              className="w-full"
            >
              Reconcile
            </Button>
          </div>
        </div>
      </div>

      {/* Reconciliation Content */}
      {selectedBankAccount && (
        <div className="bg-white rounded-xl border border-slate-200">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : !reconciliationData ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                <FileText className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">No data available</h3>
                <p className="text-slate-500 mb-4">Select a bank account and statement date to reconcile.</p>
                <Button
                  variant="primary"
                  onClick={fetchReconciliation}
                  icon={<RefreshCw className="w-4 h-4" />}
                >
                  Generate Reconciliation
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* Account Summary */}
              <div className="mb-8 p-4 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-slate-600">Account</div>
                    <div className="font-semibold">{reconciliationData.bankAccount.account_name}</div>
                    <div className="text-sm text-slate-500">{reconciliationData.bankAccount.account_number}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Bank</div>
                    <div className="font-semibold">{reconciliationData.bankAccount.bank_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Statement Date</div>
                    <div className="font-semibold">{new Date(reconciliationData.statementDate).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Status</div>
                    <div className={reconciliationData.balances.difference === 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {reconciliationData.balances.difference === 0 ? 'Reconciled' : 'Not Reconciled'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-sm text-green-700 mb-1">Bank Balance</div>
                  <div className="text-2xl font-bold text-green-800">{formatCurrency(reconciliationData.balances.bankBalance)}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-700 mb-1">Accounting Balance</div>
                  <div className="text-2xl font-bold text-blue-800">{formatCurrency(reconciliationData.balances.accountingBalance)}</div>
                </div>
                <div className={`p-4 rounded-lg border ${reconciliationData.balances.difference === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="text-sm mb-1">Difference</div>
                  <div className={`text-2xl font-bold ${reconciliationData.balances.difference === 0 ? 'text-green-800' : 'text-red-800'}`}>
                    {formatCurrency(reconciliationData.balances.difference)}
                  </div>
                </div>
              </div>

              {/* Reconciliation Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bank Transactions */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <span>Bank Transactions</span>
                    <span className="ml-2 bg-slate-100 text-slate-800 text-xs font-medium px-2 py-1 rounded-full">
                      {reconciliationData.bankTransactions.length}
                    </span>
                  </h3>
                  <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
                    {reconciliationData.bankTransactions.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No bank transactions found
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Debit</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Credit</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {reconciliationData.bankTransactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm text-slate-600 whitespace-nowrap">
                                {new Date(transaction.transaction_date).toLocaleDateString('en-IN')}
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-800">
                                <div>{transaction.description}</div>
                                {transaction.reference_number && (
                                  <div className="text-xs text-slate-500">Ref: {transaction.reference_number}</div>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-800 whitespace-nowrap">
                                {transaction.debit_amount > 0 ? formatCurrency(transaction.debit_amount) : ''}
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-800 whitespace-nowrap">
                                {transaction.credit_amount > 0 ? formatCurrency(transaction.credit_amount) : ''}
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-800 whitespace-nowrap">
                                {formatCurrency(transaction.running_balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Accounting Entries */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <span>Accounting Entries</span>
                    <span className="ml-2 bg-slate-100 text-slate-800 text-xs font-medium px-2 py-1 rounded-full">
                      {reconciliationData.accountingEntries.length}
                    </span>
                  </h3>
                  <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
                    {reconciliationData.accountingEntries.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No accounting entries found
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Debit</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {reconciliationData.accountingEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm text-slate-600 whitespace-nowrap">
                                {new Date(entry.journal_entry.entry_date).toLocaleDateString('en-IN')}
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-800">
                                <div>{entry.journal_entry.narration}</div>
                                <div className="text-xs text-slate-500">Entry: {entry.journal_entry.entry_number}</div>
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-800 whitespace-nowrap">
                                {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : ''}
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-800 whitespace-nowrap">
                                {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* Reconciliation Status */}
              <div className="mt-8 p-4 rounded-lg border flex items-center justify-between">
                <div className="flex items-center">
                  {reconciliationData.balances.difference === 0 ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-green-800 font-medium">Account is reconciled</span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded-full bg-red-600 mr-2 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                      <span className="text-red-800 font-medium">Account is not reconciled</span>
                    </>
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  Difference: {formatCurrency(reconciliationData.balances.difference)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BankReconciliationList;