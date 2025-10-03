// src/components/items/ItemsLayout.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const ItemsLayout = ({ children, activeTab = 'items' }) => {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalItems: 0,
    activeItems: 0,
    lowStockItems: 0,
    totalValue: 0
  });

  // Navigation tabs
  const tabs = [
    {
      id: 'items',
      label: 'Items',
      path: '/items',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2" />
        </svg>
      )
    },
    {
      id: 'current-stock',
      label: 'Current Stock',
      path: '/items/current-stock',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'stock-adjustment',
      label: 'Stock Adjustment',
      path: '/items/stock-adjustment',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    }
  ];

  const handleTabClick = (path) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Title and Breadcrumb */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
              <nav className="flex mt-2" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L9 5.414V17a1 1 0 102 0V5.414l5.293 5.293a1 1 0 001.414-1.414l-7-7z"/>
                      </svg>
                      Dashboard
                    </button>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span className="ml-1 text-sm font-medium text-slate-900 md:ml-2">Items</span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.path)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab.icon}
                  <span className="ml-2">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Stats Bar (optional) */}
      {(stats.totalItems > 0 || stats.lowStockItems > 0) && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-6">
                {stats.totalItems > 0 && (
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2" />
                    </svg>
                    <span className="text-blue-900">
                      <span className="font-medium">{stats.totalItems}</span> Total Items
                    </span>
                  </div>
                )}
                
                {stats.activeItems > 0 && (
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-blue-900">
                      <span className="font-medium">{stats.activeItems}</span> Active
                    </span>
                  </div>
                )}
              </div>

              {stats.lowStockItems > 0 && (
                <div className="flex items-center">
                  <div className="flex items-center text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="font-medium">{stats.lowStockItems}</span> Low Stock Items
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer/Additional Actions */}
      <div className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end py-4">
            <div className="text-xs text-slate-500">
              Inventory Management System
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemsLayout;