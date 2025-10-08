// src/components/shared/data-display/DataTable.js
import React from 'react';

export const DataTable = ({ 
    data = [], 
    columns = [], 
    loading = false,
    onRowClick,
    emptyMessage = 'No data available',
    sortable = true,
    selectable = false,
    onSelectionChange,
    className = ''
  }) => {
    const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' })
    const [selectedRows, setSelectedRows] = React.useState(new Set())
  
    const handleSort = (key) => {
      if (!sortable) return
      
      let direction = 'asc'
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc'
      }
      setSortConfig({ key, direction })
    }
  
    const sortedData = React.useMemo(() => {
      if (!sortConfig.key) return data
      
      return [...data].sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }, [data, sortConfig])
  
    const handleSelectAll = (checked) => {
      if (checked) {
        setSelectedRows(new Set(data.map(row => row.id)))
      } else {
        setSelectedRows(new Set())
      }
      
      if (onSelectionChange) {
        onSelectionChange(checked ? data : [])
      }
    }
  
    const handleSelectRow = (rowId, checked) => {
      const newSelected = new Set(selectedRows)
      
      if (checked) {
        newSelected.add(rowId)
      } else {
        newSelected.delete(rowId)
      }
      
      setSelectedRows(newSelected)
      
      if (onSelectionChange) {
        const selectedData = data.filter(row => newSelected.has(row.id))
        onSelectionChange(selectedData)
      }
    }
  
    return (
      <div className={`overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider
                    ${sortable && column.sortable !== false ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}
                  `}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {sortable && column.sortable !== false && (
                      <div className="flex flex-col">
                        <svg className={`w-3 h-3 ${sortConfig.key === column.key && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                        </svg>
                        <svg className={`w-3 h-3 -mt-1 ${sortConfig.key === column.key && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-slate-600">Loading data...</p>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-slate-500 font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={`
                    hover:bg-slate-50 transition-colors
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${selectedRows.has(row.id) ? 'bg-blue-50' : ''}
                  `}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {selectable && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleSelectRow(row.id, e.target.checked)
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                      {column.render ? column.render(row[column.key], row) : (
                        <span className="text-sm text-slate-900">{row[column.key]}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }