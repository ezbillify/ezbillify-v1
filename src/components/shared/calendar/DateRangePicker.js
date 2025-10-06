// src/components/shared/calendar/DateRangePicker.js
import React from 'react';
import DatePicker from './DatePicker';

const DateRangePicker = ({ 
  label,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  error,
  required = false,
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label} 
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <DatePicker
          placeholder="Select from date"
          value={startDate}
          onChange={onStartDateChange}
          disabled={disabled}
          maxDate={endDate}
          {...props}
        />
        
        <DatePicker
          placeholder="Select to date"
          value={endDate}
          onChange={onEndDateChange}
          disabled={disabled}
          minDate={startDate}
          {...props}
        />
      </div>
      
      {error && (
        <div className="mt-2 flex items-start">
          <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;