// src/components/shared/navigation/Breadcrumb.js
export const Breadcrumb = ({ items, className = '' }) => {
    const router = useRouter()
    
    return (
      <nav className={`flex items-center space-x-2 text-sm ${className}`}>
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            {index > 0 && (
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            
            {item.href && index < items.length - 1 ? (
              <button
                onClick={() => router.push(item.href)}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className={index === items.length - 1 ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                {item.label}
              </span>
            )}
          </div>
        ))}
      </nav>
    )
  }
  