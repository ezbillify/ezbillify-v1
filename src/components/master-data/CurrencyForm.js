import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'
import Button from '../shared/ui/Button'
import Input from '../shared/ui/Input'
import Select from '../shared/ui/Select'
import FormField from '../shared/forms/FormField'
import FormSection from '../shared/forms/FormSection'
import ValidationMessage from '../shared/forms/ValidationMessage'
import { useToast } from '../../hooks/useToast'

const CurrencyForm = ({ currency = null, onSave, onCancel }) => {
  const { company } = useAuth()
  const { success, error, warning } = useToast() // FIXED: Use correct destructuring
  const [loading, setLoading] = useState(false)
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    currency_code: currency?.currency_code || '',
    currency_name: currency?.currency_name || '',
    currency_symbol: currency?.currency_symbol || '',
    exchange_rate: currency?.exchange_rate || 1,
    is_base_currency: currency?.is_base_currency || false,
    decimal_places: currency?.decimal_places || 2
  })

  const [errors, setErrors] = useState({})

  const popularCurrencies = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' }
  ]

  // Auto-fetch exchange rate for non-base currencies
  const fetchExchangeRate = async (currencyCode) => {
    if (!currencyCode || currencyCode === 'INR' || formData.is_base_currency) return
    
    setExchangeRateLoading(true)
    try {
      // Using a free exchange rate API (you might want to use a different service)
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/INR`)
      if (response.ok) {
        const data = await response.json()
        if (data.rates && data.rates[currencyCode]) {
          setFormData(prev => ({
            ...prev,
            exchange_rate: data.rates[currencyCode].toFixed(6)
          }))
          success('Exchange rate updated automatically')
        }
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err)
      warning('Could not fetch current exchange rate')
    } finally {
      setExchangeRateLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.currency_code.trim()) {
      newErrors.currency_code = 'Currency code is required'
    } else if (!/^[A-Z]{3}$/.test(formData.currency_code)) {
      newErrors.currency_code = 'Currency code must be 3 uppercase letters'
    }

    if (!formData.currency_name.trim()) {
      newErrors.currency_name = 'Currency name is required'
    }

    if (!formData.currency_symbol.trim()) {
      newErrors.currency_symbol = 'Currency symbol is required'
    }

    if (formData.exchange_rate <= 0) {
      newErrors.exchange_rate = 'Exchange rate must be greater than 0'
    }

    if (formData.decimal_places < 0 || formData.decimal_places > 6) {
      newErrors.decimal_places = 'Decimal places must be between 0 and 6'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      error('Please fix the form errors')
      return
    }

    setLoading(true)
    
    try {
      // If setting as base currency, first remove base from other currencies
      if (formData.is_base_currency) {
        await supabase
          .from('currencies')
          .update({ is_base_currency: false })
          .eq('company_id', company?.id)

        // Set exchange rate to 1 for base currency
        formData.exchange_rate = 1
      }

      const currencyData = {
        ...formData,
        company_id: company?.id,
        exchange_rate: parseFloat(formData.exchange_rate),
        decimal_places: parseInt(formData.decimal_places)
      }

      let result
      if (currency?.id) {
        // Update existing currency
        result = await supabase
          .from('currencies')
          .update(currencyData)
          .eq('id', currency.id)
          .select()
      } else {
        // Create new currency
        result = await supabase
          .from('currencies')
          .insert([currencyData])
          .select()
      }

      if (result.error) throw result.error

      success(
        currency?.id ? 'Currency updated successfully' : 'Currency created successfully'
      )

      onSave?.(result.data[0])
    } catch (err) {
      console.error('Error saving currency:', err)
      error(err.message || 'Failed to save currency')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const selectPopularCurrency = (selectedCurrency) => {
    setFormData(prev => ({
      ...prev,
      currency_code: selectedCurrency.code,
      currency_name: selectedCurrency.name,
      currency_symbol: selectedCurrency.symbol
    }))
    
    // Fetch exchange rate if not base currency
    if (selectedCurrency.code !== 'INR' && !formData.is_base_currency) {
      fetchExchangeRate(selectedCurrency.code)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Currency Details">
        {/* Popular Currencies Quick Select */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Select Popular Currencies
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {popularCurrencies.map((curr) => (
              <Button
                key={curr.code}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectPopularCurrency(curr)}
                className="text-xs justify-start"
              >
                {curr.symbol} {curr.code}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Currency Code" required>
            <Input
              value={formData.currency_code}
              onChange={(e) => handleChange('currency_code', e.target.value.toUpperCase())}
              placeholder="e.g., USD, EUR, GBP"
              maxLength={3}
              error={!!errors.currency_code}
            />
            <ValidationMessage message={errors.currency_code} />
            <div className="text-xs text-gray-500 mt-1">
              3-letter ISO currency code (e.g., USD, EUR)
            </div>
          </FormField>

          <FormField label="Currency Name" required>
            <Input
              value={formData.currency_name}
              onChange={(e) => handleChange('currency_name', e.target.value)}
              placeholder="e.g., US Dollar, Euro"
              error={!!errors.currency_name}
            />
            <ValidationMessage message={errors.currency_name} />
          </FormField>

          <FormField label="Currency Symbol" required>
            <Input
              value={formData.currency_symbol}
              onChange={(e) => handleChange('currency_symbol', e.target.value)}
              placeholder="e.g., $, €, £"
              error={!!errors.currency_symbol}
            />
            <ValidationMessage message={errors.currency_symbol} />
          </FormField>

          <FormField label="Decimal Places">
            <Select
              value={formData.decimal_places}
              onChange={(value) => handleChange('decimal_places', parseInt(value))}
              error={!!errors.decimal_places}
            >
              <option value={0}>0 (No decimals)</option>
              <option value={2}>2 (Standard)</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={6}>6 (High precision)</option>
            </Select>
            <ValidationMessage message={errors.decimal_places} />
          </FormField>

          <FormField label="Exchange Rate (to INR)" required>
            <div className="relative">
              <Input
                type="number"
                value={formData.exchange_rate}
                onChange={(e) => handleChange('exchange_rate', e.target.value)}
                placeholder="1.00"
                step="0.000001"
                min="0.000001"
                error={!!errors.exchange_rate}
                disabled={formData.is_base_currency || exchangeRateLoading}
              />
              {!formData.is_base_currency && formData.currency_code && formData.currency_code !== 'INR' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="absolute right-1 top-1 h-8"
                  onClick={() => fetchExchangeRate(formData.currency_code)}
                  loading={exchangeRateLoading}
                >
                  Fetch Rate
                </Button>
              )}
            </div>
            <ValidationMessage message={errors.exchange_rate} />
            {formData.is_base_currency && (
              <div className="text-xs text-blue-600 mt-1">
                Base currency exchange rate is always 1.00
              </div>
            )}
          </FormField>

          <FormField label="Base Currency">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_base_currency}
                onChange={(e) => {
                  handleChange('is_base_currency', e.target.checked)
                  if (e.target.checked) {
                    handleChange('exchange_rate', 1)
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">Set as base currency</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Base currency is used for internal calculations and reports
            </div>
          </FormField>
        </div>

        {/* Currency Preview */}
        {formData.currency_code && formData.currency_symbol && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Currency Preview</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Code:</strong> {formData.currency_code}</div>
              <div><strong>Name:</strong> {formData.currency_name}</div>
              <div><strong>Symbol:</strong> {formData.currency_symbol}</div>
              <div><strong>Sample Format:</strong> {formData.currency_symbol}1,234.{Array(formData.decimal_places).fill('0').join('')}</div>
              {!formData.is_base_currency && (
                <div><strong>Exchange Rate:</strong> 1 {formData.currency_code} = ₹{formData.exchange_rate}</div>
              )}
            </div>
          </div>
        )}

        {/* Exchange Rate Info */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Exchange Rate Information</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div>• Exchange rates are relative to your base currency (typically INR)</div>
            <div>• Base currency always has an exchange rate of 1.00</div>
            <div>• Use "Fetch Rate" to get current market rates automatically</div>
            <div>• You can manually update rates as needed for your business</div>
            <div>• Historical transactions keep their original exchange rates</div>
          </div>
        </div>
      </FormSection>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {currency?.id ? 'Update Currency' : 'Add Currency'}
        </Button>
      </div>
    </form>
  )
}

export default CurrencyForm