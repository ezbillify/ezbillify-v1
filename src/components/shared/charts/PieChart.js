// src/components/shared/charts/PieChart.js
import React from 'react';

const PieChart = ({ data, title, height = 300 }) => {
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

  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16'  // lime
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  let cumulativePercentage = 0;
  const slices = data.map((d, i) => {
    const percentage = (d.value / total) * 100;
    const startAngle = (cumulativePercentage / 100) * 360;
    const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
    cumulativePercentage += percentage;

    return {
      ...d,
      percentage,
      startAngle,
      endAngle,
      color: colors[i % colors.length]
    };
  });

  const createArc = (startAngle, endAngle) => {
    const start = polarToCartesian(50, 50, 40, endAngle);
    const end = polarToCartesian(50, 50, 40, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return [
      'M', 50, 50,
      'L', start.x, start.y,
      'A', 40, 40, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      
      <div className="flex items-center justify-between gap-6">
        {/* Pie Chart */}
        <div className="flex-shrink-0" style={{ width: `${height}px`, height: `${height}px` }}>
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {slices.map((slice, i) => (
              <g key={i}>
                <path
                  d={createArc(slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              </g>
            ))}
            {/* Center circle for donut effect - optional */}
            <circle cx="50" cy="50" r="20" fill="white" />
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: slice.color }}
                ></div>
                <span className="text-sm text-slate-700">{slice.label}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">
                  ₹{slice.value.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-slate-500">
                  {slice.percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PieChart;