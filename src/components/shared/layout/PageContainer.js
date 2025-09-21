// src/components/shared/layout/PageContainer.js
export const PageContainer = ({ 
    children, 
    title, 
    subtitle,
    actions,
    breadcrumbs,
    maxWidth = '7xl',
    className = ''
  }) => {
    const maxWidthClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md', 
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '5xl': 'max-w-5xl',
      '6xl': 'max-w-6xl',
      '7xl': 'max-w-7xl',
      full: 'max-w-full'
    }
  
    return (
      <div className={`mx-auto ${maxWidthClasses[maxWidth]} ${className}`}>
        {/* Page Header */}
        <div className="mb-8">
          {breadcrumbs && (
            <div className="mb-4">
              <Breadcrumb items={breadcrumbs} />
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="text-slate-600 mt-2">{subtitle}</p>
              )}
            </div>
            
            {actions && (
              <div className="flex items-center space-x-3">
                {actions}
              </div>
            )}
          </div>
        </div>
        
        {/* Page Content */}
        <div>{children}</div>
      </div>
    )
  }
  