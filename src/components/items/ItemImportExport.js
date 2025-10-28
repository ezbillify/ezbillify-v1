// src/components/items/ItemImportExport.js
import React, { useState, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../shared/ui/Button';
import Modal from '../shared/ui/Modal';

const ItemImportExport = ({ companyId, onImportComplete, isOpen, onClose }) => {
  const { success, error: showError } = useToast();
  const { getAccessToken } = useAuth();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Handle file selection
  const handleFile = (file) => {
    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv',
      '.xls',
      '.xlsx'
    ];
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const isValidType = validTypes.includes(file.type) || validTypes.includes(`.${fileExtension}`);
    
    if (!isValidType) {
      showError('Please upload a valid CSV or Excel file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('File size exceeds 5MB limit');
      return;
    }
    
    processImport(file);
  };

  // Process the import
  const processImport = async (file) => {
    setIsProcessing(true);
    setImportStats(null);
    
    try {
      const token = getAccessToken();
      if (!token) {
        showError('Authentication required. Please sign in again.');
        setIsProcessing(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/items/import?company_id=${companyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      console.log('Import API response:', result);
      
      if (result.success) {
        setImportStats(result.data);
        // Show success message with details
        if (result.data.successful > 0 || result.data.updated > 0) {
          success(`Successfully imported ${result.data.successful} and updated ${result.data.updated} items`);
        } else {
          success('Items processed successfully');
        }
        
        // Show errors if any failed
        if (result.data.failed > 0) {
          showError(`${result.data.failed} items failed to import. Check the details below.`);
        }
        
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        showError(result.error || 'Failed to import items');
      }
    } catch (err) {
      console.error('Import error:', err);
      showError('Failed to import items: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        showError('Authentication required. Please sign in again.');
        return;
      }
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = `/api/items/export?company_id=${companyId}`;
      link.download = `items_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      success('Item data export started');
    } catch (err) {
      console.error('Export error:', err);
      showError('Failed to export items: ' + err.message);
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/item-import-template.csv';
    link.download = 'item-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset the form
  const resetForm = () => {
    setImportStats(null);
    setIsProcessing(false);
    setDragActive(false);
  };

  // Close modal and reset
  const handleClose = () => {
    resetForm();
    if (onClose) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import/Export Items" size="md">
      <div className="space-y-6">
        {/* Import Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Items</h3>
          
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              }
            >
              Download Template
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Download the CSV template to see the required format. Item codes are auto-generated.
            </p>
          </div>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xls,.xlsx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
            
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 text-gray-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">
                Drop your file here, or <span className="text-blue-600">browse</span>
              </p>
              <p className="text-xs text-gray-500">
                Supports CSV, XLS, and XLSX files (Max 5MB)
              </p>
            </div>
          </div>
          
          {isProcessing && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-sm text-blue-700">Processing import...</span>
              </div>
            </div>
          )}
          
          {importStats && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-700">{importStats.successful}</p>
                  <p className="text-xs text-green-600">Imported</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{importStats.updated}</p>
                  <p className="text-xs text-yellow-600">Updated</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{importStats.failed}</p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
              </div>
              {importStats.errors && importStats.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs text-red-600 font-medium">Errors:</p>
                  <ul className="mt-1 text-xs text-red-500 space-y-1">
                    {importStats.errors.slice(0, 3).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {importStats.errors.length > 3 && (
                      <li>+ {importStats.errors.length - 3} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Export Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Items</h3>
          <p className="text-sm text-gray-600 mb-4">
            Download all items as a CSV file for backup or external processing.
          </p>
          <Button
            variant="outline"
            onClick={handleExport}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            }
          >
            Export to CSV
          </Button>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ItemImportExport;