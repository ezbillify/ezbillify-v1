import { useState, useEffect } from 'react';
import B2BCustomerForm from './B2BCustomerForm';
import B2CCustomerForm from './B2CCustomerForm';
import Card from '../shared/ui/Card';
import Button from '../shared/ui/Button';

const CustomerForm = ({ customerId, customerType, onSave, onCancel }) => {
  const [selectedType, setSelectedType] = useState(customerType || 'b2c');
  const [showTypeSelector, setShowTypeSelector] = useState(!customerId && !customerType);

  // If editing existing customer, don't show type selector
  useEffect(() => {
    if (customerId) {
      setShowTypeSelector(false);
    }
  }, [customerId]);

  const handleTypeSelection = (type) => {
    setSelectedType(type);
    setShowTypeSelector(false);
  };

  const handleBack = () => {
    if (!customerId && !customerType) {
      setShowTypeSelector(true);
    } else if (onCancel) {
      onCancel();
    }
  };

  // Show customer type selector for new customers
  if (showTypeSelector) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Select Customer Type
            </h2>
            <p className="text-gray-600 mb-8">
              Choose the type of customer you want to add
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
              {/* B2C Customer Option */}
              <div 
                onClick={() => handleTypeSelection('b2c')}
                className="cursor-pointer p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    B2C Customer
                  </h3>
                  <p className="text-sm text-gray-600">
                    Individual consumers without GST registration
                  </p>
                </div>
              </div>

              {/* B2B Customer Option */}
              <div 
                onClick={() => handleTypeSelection('b2b')}
                className="cursor-pointer p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8h1m-1-4h1m4 4h1m-1-4h1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    B2B Customer
                  </h3>
                  <p className="text-sm text-gray-600">
                    Business customers with GST registration
                  </p>
                </div>
              </div>
            </div>

            {onCancel && (
              <div className="mt-8">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Render appropriate form based on selected type
  if (selectedType === 'b2b') {
    return (
      <B2BCustomerForm
        customerId={customerId}
        onSave={onSave}
        onCancel={handleBack}
      />
    );
  }

  return (
    <B2CCustomerForm
      customerId={customerId}
      onSave={onSave}
      onCancel={handleBack}
    />
  );
};

export default CustomerForm;
