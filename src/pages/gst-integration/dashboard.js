// src/pages/gst-integration/dashboard.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/shared/ui/Button';
import Card from '../../components/shared/ui/Card';
import { useToast } from '../../context/ToastContext';
import GSTLoginModal from '../../components/gst/GSTLoginModal';

const GSTIntegrationDashboard = () => {
  const router = useRouter();
  const { company } = useAuth();
  const { success, error: showError } = useToast();
  
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    fetchCredentials();
  }, [company?.id]);

  const fetchCredentials = async () => {
    if (!company?.id) return;
    
    try {
      const response = await fetch(`/api/gst-credentials?company_id=${company.id}`);
      const result = await response.json();
      
      if (result.success) {
        setCredentials(result.data);
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (err) {
      console.error('Error fetching credentials:', err);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!company?.id) return;
    
    try {
      const response = await fetch(`/api/gst-credentials?company_id=${company.id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        success('GST account disconnected successfully');
        setCredentials(null);
        setConnectionStatus('disconnected');
      } else {
        showError(result.error || 'Failed to disconnect');
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
      showError('Failed to disconnect');
    }
  };

  const handleConnectSuccess = () => {
    fetchCredentials();
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800">Connected</span>;
      case 'disconnected':
        return <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-800">Disconnected</span>;
      case 'checking':
        return <span className="px-3 py-1 text-sm rounded-full bg-yellow-100 text-yellow-800">Checking...</span>;
      case 'error':
        return <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-800">Error</span>;
      default:
        return <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading GST integration dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">GST Integration</h1>
            <p className="text-gray-600 mt-2">Manage your e-Invoice and e-Way Bill integration</p>
          </div>
          <div className="flex items-center space-x-4">
            {getStatusBadge()}
            <Button
              variant="outline"
              onClick={() => setShowLoginModal(true)}
            >
              {credentials ? 'Edit Credentials' : 'Connect Account'}
            </Button>
          </div>
        </div>
        
        {connectionStatus === 'disconnected' ? (
          <Card className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No GST Account Connected</h3>
            <p className="mt-2 text-gray-500">Connect your GST account to start generating e-Invoices and e-Way Bills</p>
            <div className="mt-6">
              <Button
                onClick={() => setShowLoginModal(true)}
              >
                Connect GST Account
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Connection Status Card */}
            <Card className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Connection Status</h2>
                  <p className="text-gray-500 mt-1">
                    {credentials?.is_sandbox ? 'Sandbox Mode' : 'Production Mode'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">GSTIN</p>
                    <p className="font-medium">{credentials?.gstin || 'N/A'}</p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </Card>
            
            {/* Integration Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* e-Invoice Card */}
              <Card>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">e-Invoice</h3>
                    <p className="mt-2 text-gray-500">
                      Generate IRN and QR codes for B2B invoices
                    </p>
                    <div className="mt-4">
                      <Button
                        onClick={() => router.push('/gst-integration/einvoice-list')}
                        disabled={!credentials}
                      >
                        Manage e-Invoices
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* e-Way Bill Card */}
              <Card>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">e-Way Bill</h3>
                    <p className="mt-2 text-gray-500">
                      Generate e-Way Bills for goods transportation
                    </p>
                    <div className="mt-4">
                      <Button
                        onClick={() => router.push('/gst-integration/ewaybill-list')}
                        disabled={!credentials}
                      >
                        Manage e-Way Bills
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Server Information */}
            <Card>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Server Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700">Primary Server</h4>
                  <p className="text-sm text-gray-500 mt-1 break-all">
                    {credentials?.is_sandbox 
                      ? 'https://gstsandbox.charteredinfo.com' 
                      : 'https://einvapi.charteredinfo.com'}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700">Backup Server 1</h4>
                  <p className="text-sm text-gray-500 mt-1 break-all">
                    {credentials?.is_sandbox 
                      ? 'N/A' 
                      : 'https://einvapimum1.charteredinfo.com'}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700">Backup Server 2</h4>
                  <p className="text-sm text-gray-500 mt-1 break-all">
                    {credentials?.is_sandbox 
                      ? 'N/A' 
                      : 'https://einvapidel2.charteredinfo.com'}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
      
      {/* GST Login Modal */}
      <GSTLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onConnect={handleConnectSuccess}
      />
    </div>
  );
};

export default GSTIntegrationDashboard;