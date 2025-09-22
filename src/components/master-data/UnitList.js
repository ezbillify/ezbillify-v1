// src/components/master-data/UnitList.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Button from '../shared/ui/Button'
import Card from '../shared/ui/Card'
import Modal from '../shared/ui/Modal'

const UnitList = () => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [formData, setFormData] = useState({
    unit_name: '',
    unit_symbol: '',
    unit_type: 'count',
    base_unit_id: '',
    conversion_factor: 1
  })

  const unitTypes = [
    { value: 'count', label: 'Count' },
    { value: 'weight', label: 'Weight' },
    { value: 'volume', label: 'Volume' },
    { value: 'length', label: 'Length' },
    { value: 'area', label: 'Area' },
    { value: 'time', label: 'Time' },
    { value: 'custom', label: 'Custom' }
  ]

  const commonUnits = [
    { name: 'Pieces', symbol: 'PCS', type: 'count' },
    { name: 'Kilogram', symbol: 'KG', type: 'weight' },
    { name: 'Gram', symbol: 'GM', type: 'weight' },
    { name: 'Litre', symbol: 'LTR', type: 'volume' },
    { name: 'Meter', symbol: 'MTR', type: 'length' },
    { name: 'Box', symbol: 'BOX', type: 'count' },
    { name: 'Dozen', symbol: 'DOZ', type: 'count' }
  ]

  useEffect(() => {
    if (company?.id) {
      loadUnits()
    }
  }, [company])

  const loadUnits = async () => {
    if (!company?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/master-data/units?company_id=${company.id}`)
      const result = await response.json()
      
      if (result.success) {
        setUnits(result.data)
      } else {
        error('Failed to load units')
      }
    } catch (err) {
      console.error('Error loading units:', err)
      error('Failed to load units')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!company?.id) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/master-data/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: company.id,
          ...formData
        })
      })

      const result = await response.json()
      
      if (result.success) {
        success('Unit saved successfully')
        setShowForm(false)
        resetForm()
        loadUnits()
      } else {
        error(result.error || 'Failed to save unit')
      }
    } catch (err) {
      console.error('Error saving unit:', err)
      error('Failed to save unit')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      unit_name: '',
      unit_symbol: '',
      unit_type: 'count',
      base_unit_id: '',
      conversion_factor: 1
    })
  }

  const quickAddUnit = (unit) => {
    setFormData({
      unit_name: unit.name,
      unit_symbol: unit.symbol,
      unit_type: unit.type,
      base_unit_id: '',
      conversion_factor: 1
    })
    setShowForm(true)
  }

  const companyUnits = units.filter(unit => unit.company_id === company?.id)
  const globalUnits = units.filter(unit => unit.company_id === null)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Units of Measurement</h2>
          <p className="text-gray-600 mt-1">
            Manage units for items and services
          </p>
        </div>
        
        <Button
          onClick={() => setShowForm(true)}
          variant="primary"
        >
          Add Custom Unit
        </Button>
      </div>

      {/* Quick Add Common Units */}
      {companyUnits.length === 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Setup</h3>
          <p className="text-gray-600 mb-4">Add common units to get started:</p>
          <div className="flex flex-wrap gap-2">
            {commonUnits.map(unit => (
              <Button
                key={unit.symbol}
                onClick={() => quickAddUnit(unit)}
                variant="outline"
                size="sm"
              >
                {unit.name} ({unit.symbol})
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Global Units */}
      {globalUnits.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Standard Units</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {globalUnits.map(unit => (
              <Card key={unit.id} className="p-4 text-center">
                <div className="font-semibold text-gray-900">{unit.unit_name}</div>
                <div className="text-sm text-gray-600">{unit.unit_symbol}</div>
                <div className="text-xs text-blue-600 mt-1 capitalize">{unit.unit_type}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Company Units */}
      {companyUnits.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Units</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {companyUnits.map(unit => (
              <Card key={unit.id} className="p-4 text-center">
                <div className="font-semibold text-gray-900">{unit.unit_name}</div>
                <div className="text-sm text-gray-600">{unit.unit_symbol}</div>
                <div className="text-xs text-green-600 mt-1 capitalize">{unit.unit_type}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Unit Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          resetForm()
        }}
        title="Add Custom Unit"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Name *
            </label>
            <input
              type="text"
              value={formData.unit_name}
              onChange={(e) => setFormData(prev => ({ ...prev, unit_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Pieces"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Symbol *
            </label>
            <input
              type="text"
              value={formData.unit_symbol}
              onChange={(e) => setFormData(prev => ({ ...prev, unit_symbol: e.target.value.toUpperCase() }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., PCS"
              maxLength={10}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Type
            </label>
            <select
              value={formData.unit_type}
              onChange={(e) => setFormData(prev => ({ ...prev, unit_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {unitTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
            >
              Create Unit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default UnitList