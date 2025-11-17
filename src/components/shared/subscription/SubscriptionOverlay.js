// src/components/shared/subscription/SubscriptionOverlay.js
import React from 'react'
import Button from '../ui/Button'

const SubscriptionOverlay = ({ company, onRetryPayment, onContinueSubscription }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription Inactive</h2>
          <p className="text-gray-600">
            Your company account is currently inactive. Please renew your subscription to continue using EzBillify.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Company</span>
            <span className="text-sm font-semibold text-gray-900">{company?.name || 'Unknown Company'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Current Status</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Inactive
            </span>
          </div>
          {company?.subscription_plan && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium text-gray-700">Plan</span>
              <span className="text-sm font-semibold text-gray-900 capitalize">{company.subscription_plan}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onRetryPayment}
          >
            Retry Payment
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onContinueSubscription}
          >
            Continue Subscription
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Need help? Contact support at support@ezbillify.com
        </p>
      </div>
    </div>
  )
}

export default SubscriptionOverlay