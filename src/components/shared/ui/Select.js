// src/components/shared/ui/Select.js
import React, { useState, useRef, useEffect } from 'react'

const Select = ({ 
  label, 
  options = [], 
  value,
  onChange,
  error, 
  required = false, 
  placeholder = 'Select an option',
  searchable = false,
  disabled = false,
  className = '',
  icon,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState(options)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const selectRef = useRef(null)
  const optionsRef = useRef(null)

  useEffect(() => {
    setFilteredOptions(
      searchable && searchTerm
        ? options.filter(option => 
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : options
    )
  }, [options, searchTerm, searchable])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (event) => {
    if (disabled) return

    switch (event.key) {
      case 'Enter':
        event.preventDefault()
        if (isOpen && highlightedIndex >= 0) {
          handleOptionClick(filteredOptions[highlightedIndex])
        } else {
          setIsOpen(!isOpen)
        }
        break
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          )
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (isOpen) {
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          )
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
        break
    }
  }

  const handleOptionClick = (option) => {
    onChange(option.value)
    setIsOpen(false)
    setSearchTerm('')
    setHighlightedIndex(-1)
  }

  const selectedOption = options.find(option => option.value === value)
  const hasError = !!error

  const selectClasses = `
    relative w-full px-4 py-3 text-left 
    bg-white/90 backdrop-blur-sm border-2 rounded-xl
    transition-all duration-300 ease-in-out cursor-pointer
    focus:outline-none focus:ring-2 focus:ring-offset-1
    ${hasError 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 hover:border-slate-300'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${icon ? 'pl-12' : ''}
  `.replace(/\s+/g, ' ').trim()

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label} 
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Select Button */}
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 z-10">
            {icon}
          </div>
        )}

        <button
          type="button"
          className={selectClasses}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          {...props}
        >
          <span className={`block truncate ${selectedOption ? 'text-slate-900' : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          
          <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
            <svg 
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {/* Floating Border Effect */}
        <div className={`
          absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none
          ${isOpen ? 'opacity-100' : ''}
          ${hasError ? 'shadow-lg shadow-red-100' : 'shadow-lg shadow-blue-100'}
        `}></div>
      </div>

      {/* Options Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl shadow-slate-300/30 max-h-60 overflow-hidden">
          {/* Search Input */}
          {searchable && (
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setHighlightedIndex(-1)
                  }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto" ref={optionsRef}>
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  className={`
                    w-full px-4 py-3 text-left text-sm transition-colors duration-150
                    hover:bg-blue-50 focus:bg-blue-50 focus:outline-none
                    ${highlightedIndex === index ? 'bg-blue-50' : ''}
                    ${selectedOption?.value === option.value ? 'bg-blue-100 text-blue-900 font-medium' : 'text-slate-700'}
                  `}
                  onClick={() => handleOptionClick(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{option.label}</span>
                    {selectedOption?.value === option.value && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {option.description && (
                    <div className="text-xs text-slate-500 mt-1">{option.description}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-start">
          <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}
    </div>
  )
}

// Specialized Select Components
export const CountrySelect = (props) => {
  const countries = [
    { value: 'IN', label: 'India' },
    { value: 'US', label: 'United States' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'CA', label: 'Canada' },
    { value: 'AU', label: 'Australia' }
  ]
  
  return <Select {...props} options={countries} searchable />
}

export const CurrencySelect = (props) => {
  const currencies = [
    { value: 'INR', label: 'Indian Rupee (₹)' },
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' }
  ]
  
  return <Select {...props} options={currencies} searchable />
}

export const TaxRateSelect = ({ taxRates = [], ...props }) => {
  const options = taxRates.map(rate => ({
    value: rate.id,
    label: `${rate.tax_name} (${rate.tax_rate}%)`,
    description: `CGST: ${rate.cgst_rate}% | SGST: ${rate.sgst_rate}%`
  }))
  
  return <Select {...props} options={options} searchable />
}

export default Select
