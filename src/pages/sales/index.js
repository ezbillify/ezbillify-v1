// pages/sales/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../components/shared/layout/AppLayout';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

export default function SalesDashboard() {
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

  const salesModules = [
    {
      title: 'Quotations',
      description: 'Create and manage sales quotations',
      href: '/sales/quotations',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: 'Sales Orders',
      description: 'Convert quotations to sales orders',
      href: '/sales/sales-orders',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      title: 'Invoices',
      description: 'Generate invoices from sales orders',
      href: '/sales/invoices',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: 'Payments',
      description: 'Record customer payments and allocations',
      href: '/sales/payments',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Returns',
      description: 'Process sales returns and credit notes',
      href: '/sales/returns',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
        </svg>
      )
    }
  ];

  return (
    <AppLayout
      title="Sales Management"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales', href: '/sales' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sales Management</h1>
            <p className="text-slate-600 mt-1">Manage your sales process from quotation to payment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {salesModules.map((module) => (
            <Link 
              key={module.title}
              href={module.href}
              className="block group"
            >
              <div className="bg-white rounded-xl border border-slate-200 p-6 hover:border-orange-300 hover:shadow-sm transition-all duration-200">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 p-2 bg-orange-100 text-orange-600 rounded-lg">
                    {module.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-slate-600 mt-1 text-sm">{module.description}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-orange-600 text-sm font-medium group-hover:underline">
                    View {module.title.toLowerCase()} →
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