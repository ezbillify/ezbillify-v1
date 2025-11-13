// src/components/gst/GSTLoginModal.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../shared/ui/Button';
import Input from '../shared/ui/Input';
import { useToast } from '../../context/ToastContext';

const GSTLoginModal = ({ isOpen, onClose, onConnect }) => {
  const { company } = useAuth();
  const { success, error: showError } = useToast();
  
  const [step, setStep] = useState(1); // 1: Instructions, 2: Form, 3: Success
  const [formData, setFormData] = useState({
    gstin: '',
    username: '',
    password: '',
    client_id: '',
    client_secret: '',
    is_sandbox: false,
    provider: 'whitebooks'
  });
  const [loading, setLoading] = useState(false);

  // Auto-fill GSTIN based on company
  useEffect(() => {
    if (isOpen && company) {
      setFormData(prev => ({
        ...prev,
        gstin: company.gstin || ''
      }));
    }
  }, [isOpen, company]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/gst-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.id,
          gstin: formData.gstin,
          username: formData.username,
          password: formData.password,
          client_id: formData.client_id,
          client_secret: formData.client_secret,
          is_sandbox: formData.is_sandbox,
          provider: formData.provider
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        success(result.message || 'GST credentials saved successfully');
        setStep(3); // Show success screen
        if (onConnect) {
          onConnect();
        }
      } else {
        showError(result.error || 'Failed to save GST credentials');
      }
    } catch (err) {
      console.error('Error saving GST credentials:', err);
      showError('Failed to save GST credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setStep(1);
    setFormData({
      gstin: company?.gstin || '',
      username: '',
      password: '',
      client_id: '',
      client_secret: '',
      is_sandbox: false,
      provider: 'whitebooks'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
          aria-hidden="true"
          onClick={handleClose}
        ></div>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    GST Integration Setup
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={handleClose}
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mt-2">
                  {/* Step Indicator */}
                  <div className="flex justify-center mb-6">
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        1
                      </div>
                      <div className={`flex-auto h-1 ${step > 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        2
                      </div>
                      <div className={`flex-auto h-1 ${step > 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        3
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Instructions */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-900">Step 1: GST Integration Setup</h4>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700 mb-3">
                          To enable e-Invoice and e-Way Bill generation, you need to connect your GST account with our system.
                        </p>
                        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
                          <li>You need a valid GSTIN for your business</li>
                          <li>You must have registered with a GSP (GSP Name: Whitebooks)</li>
                          <li>You will need your GSP username and password</li>
                          <li>Client ID and Client Secret will be provided by Whitebooks</li>
                        </ol>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-xs text-yellow-700">
                          <strong>Note:</strong> Your credentials are securely stored and only used for GST transactions.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Form */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-900">Step 2: Enter Your Credentials</h4>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            GSTIN *
                          </label>
                          <Input
                            type="text"
                            name="gstin"
                            value={formData.gstin}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter your 15-digit GSTIN"
                            className="w-full text-sm"
                            size="sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            GSP Username *
                          </label>
                          <Input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter your GSP username"
                            className="w-full text-sm"
                            size="sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            GSP Password *
                          </label>
                          <Input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter your GSP password"
                            className="w-full text-sm"
                            size="sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Client ID *
                          </label>
                          <Input
                            type="text"
                            name="client_id"
                            value={formData.client_id}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter your Client ID from Whitebooks"
                            className="w-full text-sm"
                            size="sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Client Secret *
                          </label>
                          <Input
                            type="password"
                            name="client_secret"
                            value={formData.client_secret}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter your Client Secret from Whitebooks"
                            className="w-full text-sm"
                            size="sm"
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="is_sandbox"
                            id="is_sandbox"
                            checked={formData.is_sandbox}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <label htmlFor="is_sandbox" className="ml-2 block text-sm text-gray-700">
                            Use Sandbox Mode (for testing)
                          </label>
                        </div>
                        
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <p className="text-xs text-yellow-700">
                            <strong>Note:</strong> All credentials are encrypted and securely stored in our system.
                          </p>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Step 3: Success */}
                  {step === 3 && (
                    <div className="text-center py-6">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h4 className="text-md font-medium text-gray-900 mt-4">Setup Completed Successfully!</h4>
                      <p className="text-sm text-gray-600 mt-2">
                        Your GST account has been connected successfully. You can now generate e-Invoices and e-Way Bills.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {step === 1 && (
              <>
                <Button
                  onClick={handleNext}
                  className="w-full sm:ml-3 sm:w-auto"
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                >
                  Cancel
                </Button>
              </>
            )}
            
            {step === 2 && (
              <>
                <Button
                  onClick={handleSubmit}
                  loading={loading}
                  disabled={loading}
                  className="w-full sm:ml-3 sm:w-auto"
                >
                  Save Credentials
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="mt-3 w-full sm:mt-0 sm:w-auto"
                >
                  Back
                </Button>
              </>
            )}
            
            {step === 3 && (
              <Button
                onClick={handleClose}
                className="w-full sm:ml-3 sm:w-auto"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GSTLoginModal;