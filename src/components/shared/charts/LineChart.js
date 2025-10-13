// src/components/shared/charts/LineChart.js
import React from 'react';

const LineChart = ({ data, title, height = 300 }) => {
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

  // Find max value for scaling
  const maxValue = Math.max(...data.map(d => d.value));
  const scale = height / (maxValue * 1.2); // 20% padding

  // Generate SVG path
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.value * scale / height * 100);
    return `${x},${y}`;
  }).join(' ');

  const pathD = `M ${points}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
      
      <div className="relative" style={{ height: `${height}px` }}>
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#e2e8f0" strokeWidth="0.2" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.2" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#e2e8f0" strokeWidth="0.2" />

          {/* Area under line */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="url(#lineGradient)"
          />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (d.value * scale / height * 100);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1"
                fill="#3b82f6"
                className="hover:r-2 transition-all cursor-pointer"
              />
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-500 mt-2">
          {data.map((d, i) => (
            <span key={i} className="text-center">{d.label}</span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-sm">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-slate-600">{d.label}: </span>
            <span className="font-semibold text-slate-900">₹{d.value.toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LineChart;