// src/components/shared/layout/SectionCard.js
export const SectionCard = ({ 
    title, 
    subtitle,
    children, 
    actions,
    collapsible = false,
    defaultExpanded = true,
    className = ''
  }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  
    return (
      <div className={`bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden ${className}`}>
        {/* Header */}
        <div 
          className={`
            px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50
            ${collapsible ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}
          `}
          onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              {subtitle && (
                <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {actions && !collapsible && (
                <div className="flex items-center space-x-2">
                  {actions}
                </div>
              )}
              
              {collapsible && (
                <svg 
                  className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </div>
        </div>
        
        {/* Content */}
        {(!collapsible || isExpanded) && (
          <div className="p-6">
            {children}
          </div>
        )}
      </div>
    )
  }
  