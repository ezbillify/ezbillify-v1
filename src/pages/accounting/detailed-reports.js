// pages/accounting/detailed-reports.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../components/shared/layout/AppLayout';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

export default function DetailedReportsPage() {
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

  const reportCategories = [
    {
      title: 'Sales Reports',
      description: 'Detailed reports on sales performance',
      reports: [
        {
          title: 'Customer-wise Sales',
          description: 'Analyze sales by customer',
          href: '/accounting/reports/sales/customer-wise',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        },
        {
          title: 'Bill-wise Sales',
          description: 'Detailed view of all sales invoices',
          href: '/accounting/reports/sales/bill-wise',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        },
        {
          title: 'Product-wise Sales',
          description: 'Analyze sales by product',
          href: '/accounting/reports/sales/product-wise',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'Purchase Reports',
      description: 'Detailed reports on purchase activities',
      reports: [
        {
          title: 'Supplier-wise Purchases',
          description: 'Analyze purchases by supplier',
          href: '/accounting/reports/purchase/supplier-wise',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        },
        {
          title: 'Bill-wise Purchases',
          description: 'Detailed view of all purchase invoices',
          href: '/accounting/reports/purchase/bill-wise',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        },
        {
          title: 'Product-wise Purchases',
          description: 'Analyze purchases by product',
          href: '/accounting/reports/purchase/product-wise',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )
        }
      ]
    },
    {
      title: 'Inventory Reports',
      description: 'Stock and inventory management reports',
      reports: [
        {
          title: 'Stock Summary',
          description: 'Current stock levels and values',
          href: '/accounting/reports/inventory/stock-summary',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          )
        },
        {
          title: 'Stock Movement',
          description: 'Track stock movements over time',
          href: '/accounting/reports/inventory/stock-movement',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          )
        },
        {
          title: 'Low Stock Alert',
          description: 'Products with low stock levels',
          href: '/accounting/reports/inventory/low-stock',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        }
      ]
    }
  ];

  return (
    <AppLayout
      title="Detailed Reports"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Accounting', href: '/accounting' },
        { label: 'Reports', href: '/accounting/reports' },
        { label: 'Detailed Reports', href: '/accounting/detailed-reports' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Detailed Reports</h1>
            <p className="text-slate-600 mt-1">Comprehensive reports for sales, purchases, and inventory</p>
          </div>
        </div>

        <div className="space-y-8">
          {reportCategories.map((category) => (
            <div key={category.title}>
              <h2 className="text-xl font-semibold text-slate-800 mb-4">{category.title}</h2>
              <p className="text-slate-600 mb-6">{category.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.reports.map((report) => (
                  <Link 
                    key={report.title}
                    href={report.href}
                    className="block group"
                  >
                    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:border-orange-300 hover:shadow-sm transition-all duration-200 h-full">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 p-2 bg-orange-100 text-orange-600 rounded-lg">
                          {report.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                            {report.title}
                          </h3>
                          <p className="text-slate-600 mt-1 text-sm">{report.description}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="text-orange-600 text-sm font-medium group-hover:underline">
                          View report →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}