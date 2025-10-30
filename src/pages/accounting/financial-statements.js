// pages/accounting/financial-statements.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../components/shared/layout/AppLayout';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

export default function FinancialStatementsPage() {
  const router = useRouter();
  const { user, company, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800">No Company Found</h2>
          <p className="text-slate-600 mt-2">Please set up your company first</p>
        </div>
      </div>
    );
  }

  const statements = [
    {
      title: 'Balance Sheet',
      description: 'View your company\'s financial position at a specific point in time',
      href: '/accounting/reports/balance-sheet',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'Profit & Loss',
      description: 'Analyze your company\'s revenues, expenses, and profitability over a period',
      href: '/accounting/reports/profit-loss',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'Cash Flow Statement',
      description: 'Track the movement of cash in and out of your business',
      href: '/accounting/reports/cash-flow',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <AppLayout
      title="Financial Statements"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Accounting', href: '/accounting' },
        { label: 'Financial Statements', href: '/accounting/financial-statements' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Financial Statements</h1>
            <p className="text-slate-600 mt-1">Access key financial statements and reports</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statements.map((statement) => (
            <Link 
              key={statement.title}
              href={statement.href}
              className="block group"
            >
              <div className="bg-white rounded-xl border border-slate-200 p-6 hover:border-orange-300 hover:shadow-sm transition-all duration-200">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 p-2 bg-orange-100 text-orange-600 rounded-lg">
                    {statement.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                      {statement.title}
                    </h3>
                    <p className="text-slate-600 mt-1 text-sm">{statement.description}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-orange-600 text-sm font-medium group-hover:underline">
                    View statement →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}