// src/components/shared/calendar/ReportScheduler.js
import React, { useState } from 'react';
import Select from '../ui/Select';
import DatePicker from './DatePicker';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ReportScheduler = ({ 
  onSchedule,
  reportTypes = [],
  className = ''
}) => {
  const [scheduleData, setScheduleData] = useState({
    reportType: '',
    frequency: 'daily',
    startDate: new Date().toISOString().split('T')[0],
    time: '09:00',
    email: '',
    format: 'pdf'
  });

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  const formatOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel (XLSX)' },
    { value: 'csv', label: 'CSV' }
  ];

  const handleChange = (field, value) => {
    setScheduleData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSchedule) {
      onSchedule(scheduleData);
    }
  };

  return (
    <div className={`bg-white/90 backdrop-blur-sm border-2 border-slate-200 rounded-xl shadow-sm p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Schedule Report
        </h3>
        <p className="text-sm text-slate-600 mt-1">Automatically generate and send reports</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Report Type"
          value={scheduleData.reportType}
          onChange={(value) => handleChange('reportType', value)}
          options={reportTypes}
          required
          placeholder="Select report type"
        />

        <Select
          label="Frequency"
          value={scheduleData.frequency}
          onChange={(value) => handleChange('frequency', value)}
          options={frequencyOptions}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            label="Start Date"
            value={scheduleData.startDate}
            onChange={(value) => handleChange('startDate', value)}
            required
            minDate={new Date().toISOString().split('T')[0]}
          />

          <Input
            label="Time"
            type="time"
            value={scheduleData.time}
            onChange={(e) => handleChange('time', e.target.value)}
            required
          />
        </div>

        <Input
          label="Email Recipients"
          type="email"
          value={scheduleData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="email@example.com"
          helperText="Separate multiple emails with commas"
          required
        />

        <Select
          label="Format"
          value={scheduleData.format}
          onChange={(value) => handleChange('format', value)}
          options={formatOptions}
          required
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" variant="primary">
            Schedule Report
          </Button>
          <Button 
            type="button" 
            variant="ghost"
            onClick={() => setScheduleData({
              reportType: '',
              frequency: 'daily',
              startDate: new Date().toISOString().split('T')[0],
              time: '09:00',
              email: '',
              format: 'pdf'
            })}
          >
            Clear
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ReportScheduler;