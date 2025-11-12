// src/pages/gst-filings/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/shared/ui/Button';
import Card from '../../components/shared/ui/Card';

const GSTFilingsDashboard = () => {
  const router = useRouter();
  const { company } = useAuth();
  
  const [activeTab, setActiveTab] = useState('filings');

  const filingOptions = [
    {
      id: 'gstr1',
      title: 'GSTR-1',
      description: 'Details of outward supplies of goods or services',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-blue-500'
    },
    {
      id: 'gstr2',
      title: 'GSTR-2',
      description: 'Details of inward supplies of goods or services',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-green-500'
    },
    {
      id: 'gstr3b',
      title: 'GSTR-3B',
      description: 'Monthly summary return',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-purple-500'
    },
    {
      id: 'reconciliation',
      title: 'Reconciliation',
      description: 'Reconcile purchase and sales data',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'bg-yellow-500'
    }
  ];

  const integrationOptions = [
    {
      id: 'integration',
      title: 'GST Integration',
      description: 'Connect your GST account for e-Invoice and e-Way Bill generation',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      color: 'bg-indigo-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">GST Filings & Compliance</h1>
          <p className="mt-2 text-gray-600">Manage your GST filings and compliance requirements</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('filings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'filings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              GST Filings
            </button>
            <button
              onClick={() => setActiveTab('integration')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'integration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Integration
            </button>
          </nav>
        </div>

        {activeTab === 'filings' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filingOptions.map((option) => (
              <Card 
                key={option.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/gst-filings/${option.id}`)}
              >
                <div className="flex items-start">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${option.color} text-white`}>
                    {option.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{option.title}</h3>
                    <p className="mt-2 text-sm text-gray-500">{option.description}</p>
                    <div className="mt-4">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {integrationOptions.map((option) => (
              <Card 
                key={option.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/gst-integration/${option.id}`)}
              >
                <div className="flex items-start">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${option.color} text-white`}>
                    {option.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{option.title}</h3>
                    <p className="mt-2 text-sm text-gray-500">{option.description}</p>
                    <div className="mt-4">
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            
            {/* Direct links to list pages */}
            <Card 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/gst-integration/einvoice`)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 p-3 rounded-lg bg-blue-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">e-Invoice</h3>
                  <p className="mt-2 text-sm text-gray-500">Generate IRN and QR codes for B2B invoices</p>
                  <div className="mt-4">
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/gst-integration/ewaybill`)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 p-3 rounded-lg bg-green-500 text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">e-Way Bill</h3>
                  <p className="mt-2 text-sm text-gray-500">Generate e-Way Bills for goods transportation</p>
                  <div className="mt-4">
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default GSTFilingsDashboard;