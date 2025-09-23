import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/utils/supabase'
import { useToast } from '../../hooks/useToast'

const UnitList = ({ onEdit, onAdd }) => {
  const { company } = useAuth()
  const { success, error } = useToast()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const unitTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'count', label: 'Count/Quantity' },
    { value: 'weight', label: 'Weight' },
    { value: 'volume', label: 'Volume' },
    { value: 'length', label: 'Length' },
    { value: 'area', label: 'Area' },
    { value: 'time', label: 'Time' },
    { value: 'other', label: 'Other' }
  ]

  useEffect(() => {
    fetchUnits()
  }, [company?.id])

  const fetchUnits = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('units')
        .select(`
          *,
          base_unit:base_unit_id(unit_name, unit_symbol)
        `)
        .or(`company_id.eq.${company?.id},company_id.is.null`)
        .order('unit_type')
        .order('unit_name')

      if (fetchError) throw fetchError
      setUnits(data || [])
    } catch (err) {
      console.error('Error fetching units:', err)
      error('Failed to load units')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (unitId) => {
    try {
      // Check if unit is being used in items
      const { data: itemUsage, error: itemError } = await supabase
        .from('items')
        .select('id')
        .or(`primary_unit_id.eq.${unitId},secondary_unit_id.eq.${unitId}`)
        .limit(1)

      if (itemError) throw itemError

      if (itemUsage?.length > 0) {
        error('Cannot delete unit that is assigned to items')
        return
      }

      // Check if unit is being used as base unit for other units
      const { data: baseUsage, error: baseError } = await supabase
        .from('units')
        .select('id')
        .eq('base_unit_id', unitId)
        .limit(1)

      if (baseError) throw baseError

      if (baseUsage?.length > 0) {
        error('Cannot delete unit that is used as base unit for other units')
        return
      }

      const { error: deleteError } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId)

      if (deleteError) throw deleteError

      success('Unit deleted successfully')
      fetchUnits()
    } catch (err) {
      console.error('Error deleting unit:', err)
      error('Failed to delete unit')
    }
    setDeleteConfirm(null)
  }

  const toggleUnitStatus = async (unit) => {
    try {
      const { error: updateError } = await supabase
        .from('units')
        .update({ is_active: !unit.is_active })
        .eq('id', unit.id)

      if (updateError) throw updateError

      success(
        `Unit ${!unit.is_active ? 'activated' : 'deactivated'} successfully`
      )
      fetchUnits()
    } catch (err) {
      console.error('Error updating unit status:', err)
      error('Failed to update unit status')
    }
  }

  const filteredUnits = units.filter(unit => {
    const matchesSearch = 
      unit.unit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.unit_symbol.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === '' || unit.unit_type === filterType
    
    return matchesSearch && matchesType
  })

  const getUnitTypeBadge = (type) => {
    const colors = {
      count: 'bg-blue-100 text-blue-800',
      weight: 'bg-green-100 text-green-800',
      volume: 'bg-purple-100 text-purple-800',
      length: 'bg-orange-100 text-orange-800',
      area: 'bg-red-100 text-red-800',
      time: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    )
  }

  const formatConversion = (unit) => {
    if (!unit.base_unit || unit.conversion_factor === 1) {
      return <span className="text-gray-500">Base Unit</span>
    }
    
    return (
      <div className="text-sm text-gray-600">
        1 {unit.unit_symbol} = {unit.conversion_factor} {unit.base_unit.unit_symbol}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Actions - Removed duplicate Add Unit button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search units by name or symbol..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {unitTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {/* Duplicate Add Unit button removed from here */}
        </div>
      </div>

      {/* Units Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {unitTypeOptions.slice(1).map(type => {
          const typeUnits = filteredUnits.filter(unit => unit.unit_type === type.value)
          const customUnits = typeUnits.filter(unit => unit.company_id !== null).length
          const systemUnits = typeUnits.filter(unit => unit.company_id === null).length
          
          return (
            <div key={type.value} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm font-medium text-gray-500">{type.label}</div>
              <div className="text-lg font-semibold text-gray-900">{typeUnits.length}</div>
              <div className="text-xs text-gray-500">
                {customUnits} custom • {systemUnits} system
              </div>
            </div>
          )
        })}
      </div>

      {/* Units Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Units of Measurement</h3>
        </div>
        
        <div className="p-6">
          {filteredUnits.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No units found</div>
              <button
                onClick={onAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create your first unit
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUnits.map((unit) => (
                    <tr key={unit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{unit.unit_name}</div>
                          <div className="text-sm text-gray-500">Symbol: {unit.unit_symbol}</div>
                          {unit.company_id === null && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                              System Unit
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getUnitTypeBadge(unit.unit_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatConversion(unit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          {unit.base_unit ? (
                            <div className="text-sm">
                              <div className="font-medium">{unit.base_unit.unit_name}</div>
                              <div className="text-gray-500">({unit.base_unit.unit_symbol})</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          unit.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {unit.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {unit.company_id !== null ? (
                          <>
                            <button
                              onClick={() => onEdit(unit)}
                              className="text-blue-600 hover:text-blue-700 px-2 py-1"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleUnitStatus(unit)}
                              className={`px-2 py-1 ${unit.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                            >
                              {unit.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(unit)}
                              className="text-red-600 hover:text-red-700 px-2 py-1"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">System Unit</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">Delete Unit</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the unit "{deleteConfirm.unit_name}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UnitList