// src/components/shared/feedback/ConfirmDialog.js
import React from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  icon,
  destructive = false
}) => {
  const variants = {
    danger: {
      confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      icon: (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      bgColor: 'bg-red-100'
    },
    warning: {
      confirmButton: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
      icon: (
        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      bgColor: 'bg-amber-100'
    },
    success: {
      confirmButton: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
      icon: (
        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-emerald-100'
    },
    primary: {
      confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgColor: 'bg-blue-100'
    }
  }

  const config = variants[variant]
  const displayIcon = icon || config.icon

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={!isLoading}
    >
      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className={`flex-shrink-0 p-3 rounded-full ${config.bgColor}`}>
          {displayIcon}
        </div>

        {/* Content */}
        <div className="flex-1 pt-2">
          <p className="text-slate-700 leading-relaxed">
            {message}
          </p>
          
          {destructive && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action cannot be undone.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3 mt-6">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          fullWidth
        >
          {cancelText}
        </Button>
        <Button
          className={`text-white ${config.confirmButton}`}
          onClick={onConfirm}
          disabled={isLoading}
          loading={isLoading}
          fullWidth
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}

// Specialized Confirm Dialogs for EzBillify
export const DeleteConfirmDialog = ({ isOpen, onClose, onConfirm, itemName, itemType = 'item' }) => {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${itemType}`}
      message={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      destructive={true}
    />
  )
}

export const InvoiceCancelDialog = ({ isOpen, onClose, onConfirm, invoice, isLoading }) => {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Cancel Invoice"
      message={`Are you sure you want to cancel Invoice ${invoice?.document_number}? This will mark it as cancelled and it cannot be sent to the customer.`}
      confirmText="Cancel Invoice"
      cancelText="Keep Invoice"
      variant="warning"
      isLoading={isLoading}
    />
  )
}

export const PaymentDeleteDialog = ({ isOpen, onClose, onConfirm, payment, isLoading }) => {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Payment Record"
      message={`Are you sure you want to delete the payment record of ₹${payment?.amount} from ${payment?.customer_name}? This action cannot be undone.`}
      confirmText="Delete Payment"
      cancelText="Cancel"
      variant="danger"
      isLoading={isLoading}
      destructive={true}
    />
  )
}

export default ConfirmDialog
