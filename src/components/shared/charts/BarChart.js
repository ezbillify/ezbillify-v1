// src/components/shared/charts/BarChart.js
import React from 'react';

const BarChart = ({ data, title, height = 300 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-slate-400">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      
      <div style={{ height: `${height}px` }} className="relative">
        <div className="flex items-end justify-between h-full gap-4 pb-8">
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Value on hover */}
                <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    ₹{item.value.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Bar */}
                <div 
                  className="w-full rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-pointer"
                  style={{ 
                    height: `${barHeight}%`,
                    backgroundColor: colors[index % colors.length]
                  }}
                ></div>

                {/* Label */}
                <div className="mt-2 text-xs text-slate-600 text-center font-medium">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Total:</span>
          <span className="font-bold text-slate-900">
            ₹{data.reduce((sum, d) => sum + d.value, 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BarChart;