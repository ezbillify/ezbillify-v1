// src/components/shared/layout/TwoColumn.js
export const TwoColumn = ({ 
    leftColumn, 
    rightColumn, 
    leftWidth = '1/3',
    gap = '6',
    className = ''
  }) => {
    const widthClasses = {
      '1/4': 'w-1/4',
      '1/3': 'w-1/3', 
      '2/5': 'w-2/5',
      '1/2': 'w-1/2'
    }
    
    const gapClasses = {
      '4': 'gap-4',
      '6': 'gap-6',
      '8': 'gap-8'
    }
  
    return (
      <div className={`flex ${gapClasses[gap]} ${className}`}>
        <div className={`${widthClasses[leftWidth]} flex-shrink-0`}>
          {leftColumn}
        </div>
        <div className="flex-1 min-w-0">
          {rightColumn}
        </div>
      </div>
    )
  }
  