// src/pages/gst-integration/login.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/shared/ui/Button';
import Input from '../../components/shared/ui/Input';
import Card from '../../components/shared/ui/Card';
import { useToast } from '../../context/ToastContext';

const GSTLogin = () => {
  const router = useRouter();
  const { company } = useAuth();
  const { success, error: showError } = useToast();
  
  const [credentials, setCredentials] = useState({
    gstin: '',
    username: '',
    password: '',
    client_id: '',
    client_secret: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [isSandbox, setIsSandbox] = useState(true);

  useEffect(() => {
    // Pre-fill sandbox credentials for testing
    if (isSandbox) {
      setCredentials({
        gstin: '34AACCC1596Q002',
        username: 'WhitebooksSandbox',
        password: 'sandbox123',
        client_id: '',
        client_secret: ''
      });
    }
  }, [isSandbox]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Save credentials to company settings
      const response = await fetch('/api/gst-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.id,
          ...credentials,
          is_sandbox: isSandbox,
          provider: 'whitebooks'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        success('GST credentials saved successfully');
        router.push('/gst-integration/dashboard');
      } else {
        showError(result.error || 'Failed to save credentials');
      }
    } catch (err) {
      console.error('Error saving credentials:', err);
      showError('Failed to save credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GST Integration</h1>
          <p className="text-gray-600">Connect your GST account for e-Invoice and e-Way Bill generation</p>
        </div>
        
        <Card className="shadow-lg">
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Whitebooks GSP Credentials</h2>
            <div className="flex items-center">
              <span className="mr-2 text-sm text-gray-600">Sandbox</span>
              <button
                onClick={() => setIsSandbox(!isSandbox)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isSandbox ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isSandbox ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="ml-2 text-sm text-gray-600">Production</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GSTIN *
                </label>
                <Input
                  type="text"
                  name="gstin"
                  value={credentials.gstin}
                  onChange={handleChange}
                  required
                  placeholder="Enter GSTIN"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <Input
                  type="text"
                  name="username"
                  value={credentials.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter username"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <Input
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter password"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID
                </label>
                <Input
                  type="text"
                  name="client_id"
                  value={credentials.client_id}
                  onChange={handleChange}
                  placeholder="Enter Client ID (if applicable)"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret
                </label>
                <Input
                  type="password"
                  name="client_secret"
                  value={credentials.client_secret}
                  onChange={handleChange}
                  placeholder="Enter Client Secret (if applicable)"
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Server Configuration</h3>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>Primary:</strong> {isSandbox ? 'https://sandbox.whitebooks.in' : 'https://api.whitebooks.in'}</p>
                <p><strong>Backup:</strong> Not applicable</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
              >
                Save & Connect
              </Button>
            </div>
          </form>
        </Card>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Need help? Refer to the <a href="https://developer.whitebooks.in" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Whitebooks Developer Guide</a></p>
        </div>
      </div>
    </div>
  );
};

export default GSTLogin;