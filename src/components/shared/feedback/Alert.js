// src/components/shared/feedback/Alert.js
const Alert = ({ type = 'info', message, onClose, title }) => {
    const baseClasses = "rounded-lg p-4 flex items-start space-x-3"
    
    const variants = {
      success: {
        container: "bg-green-50 border border-green-200",
        icon: "text-green-400",
        title: "text-green-800",
        message: "text-green-700",
        iconPath: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      },
      error: {
        container: "bg-red-50 border border-red-200",
        icon: "text-red-400",
        title: "text-red-800",
        message: "text-red-700",
        iconPath: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
      },
      warning: {
        container: "bg-yellow-50 border border-yellow-200",
        icon: "text-yellow-400",
        title: "text-yellow-800",
        message: "text-yellow-700",
        iconPath: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
      },
      info: {
        container: "bg-blue-50 border border-blue-200",
        icon: "text-blue-400",
        title: "text-blue-800",
        message: "text-blue-700",
        iconPath: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
      }
    }
  
    const variant = variants[type]
    
    return (
      <div className={`${baseClasses} ${variant.container}`}>
        {/* Icon */}
        <div className="flex-shrink-0">
          <svg className={`h-5 w-5 ${variant.icon}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d={variant.iconPath} clipRule="evenodd" />
          </svg>
        </div>
  
        {/* Content */}
        <div className="flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${variant.title} mb-1`}>
              {title}
            </h3>
          )}
          <p className={`text-sm ${variant.message}`}>
            {message}
          </p>
        </div>
  
        {/* Close Button */}
        {onClose && (
          <div className="flex-shrink-0">
            <button
              type="button"
              className={`rounded-md inline-flex ${variant.icon} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-gray-400`}
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    )
  }
  
  export default Alert
  