// src/components/dashboard/SalesTrend.js
import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/utils/supabase'

const SalesTrend = ({ companyId }) => {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('7days') // 7days, 30days, 3months

  useEffect(() => {
    const fetchSalesTrend = async () => {
      if (!companyId) return

      try {
        setLoading(true)
        
        // Calculate date range based on period
        const endDate = new Date()
        const startDate = new Date()
        
        switch (period) {
          case '7days':
            startDate.setDate(endDate.getDate() - 7)
            break
          case '30days':
            startDate.setDate(endDate.getDate() - 30)
            break
          case '3months':
            startDate.setMonth(endDate.getMonth() - 3)
            break
        }

        // Fetch sales data
        const { data: salesData, error: salesError } = await supabase
          .from('sales_documents')
          .select('document_date, total_amount, document_type')
          .eq('company_id', companyId)
          .eq('document_type', 'invoice')
          .eq('status', 'approved')
          .gte('document_date', startDate.toISOString().split('T')[0])
          .lte('document_date', endDate.toISOString().split('T')[0])
          .order('document_date', { ascending: true })

        if (salesError) {
          throw new Error('Failed to fetch sales data')
        }

        // Process data for chart
        const processedData = generateChartData(salesData || [], startDate, endDate, period)
        setChartData(processedData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSalesTrend()
  }, [companyId, period])

  const generateChartData = (salesData, startDate, endDate, period) => {
    const data = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      
      // Sum sales for this date
      const dayTotal = salesData
        .filter(sale => sale.document_date === dateStr)
        .reduce((sum, sale) => sum + (parseFloat(sale.total_amount) || 0), 0)
      
      data.push({
        date: dateStr,
        displayDate: period === '7days' 
          ? current.toLocaleDateString('en-US', { weekday: 'short' })
          : period === '30days'
          ? current.getDate().toString()
          : current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: dayTotal,
        formatted: `₹${dayTotal.toLocaleString('en-IN')}`
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    return data
  }

  const maxValue = Math.max(...chartData.map(d => d.sales), 0)
  const chartHeight = 200

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Sales Trend</h3>
          <div className="w-24 h-8 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="h-48 bg-slate-100 rounded-lg animate-pulse"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Sales Trend</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Sales Trend</h3>
        
        <div className="flex space-x-2">
          {[
            { value: '7days', label: '7D' },
            { value: '30days', label: '30D' },
            { value: '3months', label: '3M' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                period === option.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-slate-500">No sales data available</p>
          <p className="text-sm text-slate-400">Create your first invoice to see sales trends</p>
        </div>
      ) : (
        <div>
          {/* Chart Area */}
          <div className="relative" style={{ height: chartHeight }}>
            <svg width="100%" height={chartHeight} className="overflow-visible">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((percent) => (
                <line
                  key={percent}
                  x1="0"
                  y1={chartHeight * (percent / 100)}
                  x2="100%"
                  y2={chartHeight * (percent / 100)}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              ))}
              
              {/* Chart line */}
              {chartData.length > 1 && (
                <polyline
                  points={chartData
                    .map((point, index) => {
                      const x = (index / (chartData.length - 1)) * 100
                      const y = chartHeight - (point.sales / maxValue) * chartHeight
                      return `${x}%,${y}`
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              
              {/* Data points */}
              {chartData.map((point, index) => {
                const x = (index / (chartData.length - 1)) * 100
                const y = chartHeight - (point.sales / maxValue) * chartHeight
                
                return (
                  <g key={index}>
                    <circle
                      cx={`${x}%`}
                      cy={y}
                      r="4"
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="hover:r-6 transition-all cursor-pointer"
                    >
                      <title>{`${point.displayDate}: ${point.formatted}`}</title>
                    </circle>
                  </g>
                )
              })}
            </svg>
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-4 text-sm text-slate-500">
            {chartData.map((point, index) => {
              // Show every nth label to avoid crowding
              const showLabel = chartData.length <= 7 || index % Math.ceil(chartData.length / 7) === 0
              
              return (
                <span key={index} className={showLabel ? '' : 'invisible'}>
                  {point.displayDate}
                </span>
              )
            })}
          </div>
          
          {/* Summary stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Total Sales</p>
              <p className="text-lg font-semibold text-slate-900">
                ₹{chartData.reduce((sum, d) => sum + d.sales, 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Average</p>
              <p className="text-lg font-semibold text-slate-900">
                ₹{Math.round(chartData.reduce((sum, d) => sum + d.sales, 0) / chartData.length || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Peak Day</p>
              <p className="text-lg font-semibold text-slate-900">
                ₹{maxValue.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesTrend
