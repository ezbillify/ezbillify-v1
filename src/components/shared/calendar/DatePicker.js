// src/components/shared/calendar/DatePicker.js
import React, { useState, useRef, useEffect } from 'react';

const DatePicker = ({ 
  label, 
  value = '',
  onChange,
  error, 
  required = false, 
  placeholder = 'Select date',
  disabled = false,
  className = '',
  minDate,
  maxDate,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setDisplayValue(formatDisplayDate(date));
      setCurrentMonth(date);
    } else {
      setDisplayValue('');
    }
  }, [value]);

  useEffect(() => {
    if (selectedDay !== null) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay);
      if (!isDateDisabled(date)) {
        onChange(formatValueDate(date));
      }
      setSelectedDay(null);
      setIsOpen(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatValueDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isDateDisabled = (date) => {
    if (minDate && date < new Date(minDate)) return true;
    if (maxDate && date > new Date(maxDate)) return true;
    return false;
  };

  const isDateSelected = (date) => {
    if (!value) return false;
    const selected = new Date(value);
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleTodayClick = () => {
    const today = new Date();
    if (!isDateDisabled(today)) {
      onChange(formatValueDate(today));
      setIsOpen(false);
    }
  };

  const handleClearClick = () => {
    onChange('');
    setIsOpen(false);
  };

  const renderCalendarDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const disabled = isDateDisabled(date);
      const selected = isDateSelected(date);
      const today = isToday(date);
      
      days.push(
        <button
          key={`day-${day}`}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) {
              setSelectedDay(day);
            }
          }}
          disabled={disabled}
          className={`
            h-10 flex items-center justify-center text-sm rounded-lg 
            transition-colors font-medium select-none
            ${disabled 
              ? 'text-slate-300 cursor-not-allowed' 
              : 'hover:bg-blue-50 cursor-pointer text-slate-700 active:bg-blue-100'
            }
            ${selected 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : ''
            }
            ${today && !selected 
              ? 'ring-2 ring-blue-400 ring-inset' 
              : ''
            }
          `}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  const hasError = !!error;
  
  const inputClasses = `
    w-full px-4 py-3 pl-12 text-slate-900 placeholder-slate-400 
    bg-white/90 backdrop-blur-sm border-2 rounded-xl
    transition-all duration-300 ease-in-out cursor-pointer
    focus:outline-none focus:ring-2 focus:ring-offset-1
    ${hasError 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 hover:border-slate-300'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `.replace(/\s+/g, ' ').trim();

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label} 
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative group">
        <div className={`
          absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none
          transition-colors duration-200
          ${isOpen ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-500'}
        `}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        
        <button
          type="button"
          className={inputClasses}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={displayValue ? 'text-slate-900' : 'text-slate-400'}>
            {displayValue || placeholder}
          </span>
        </button>
        
        <div className={`
          absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none
          ${isOpen ? 'opacity-100' : ''}
          ${hasError ? 'shadow-lg shadow-red-100' : 'shadow-lg shadow-blue-100'}
        `}></div>
      </div>

      {isOpen && (
        <div 
          className="absolute z-[100] w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-xl p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={previousMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-sm font-semibold text-slate-800">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="h-8 flex items-center justify-center text-xs font-semibold text-slate-500">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarDays()}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between">
            <button
              type="button"
              onClick={handleTodayClick}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded hover:bg-blue-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleClearClick}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 rounded hover:bg-slate-100"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      
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

export default DatePicker;