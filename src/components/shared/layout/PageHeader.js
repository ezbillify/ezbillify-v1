// src/components/shared/layout/PageHeader.js
export const PageHeader = ({ 
    title, 
    subtitle, 
    actions, 
    breadcrumbs,
    icon,
    className = ''
  }) => {
    return (
      <div className={`bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 mb-6 shadow-lg shadow-slate-200/50 ${className}`}>
        {breadcrumbs && (
          <div className="mb-4">
            <Breadcrumb items={breadcrumbs} />
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {icon && (
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
                {icon}
              </div>
            )}
            
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="text-slate-600 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          
          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    )
  }
  