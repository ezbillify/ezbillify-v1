// src/components/shared/layout/FormLayout.js
export const FormLayout = ({ 
    children, 
    title,
    subtitle, 
    onSubmit,
    submitText = 'Save',
    cancelText = 'Cancel',
    onCancel,
    isSubmitting = false,
    className = ''
  }) => {
    return (
      <form onSubmit={onSubmit} className={`space-y-6 ${className}`}>
        {/* Form Header */}
        {(title || subtitle) && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="text-slate-600 mt-2">{subtitle}</p>
            )}
          </div>
        )}
        
        {/* Form Content */}
        <div className="space-y-6">
          {children}
        </div>
        
        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {cancelText}
            </Button>
          )}
          
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {submitText}
          </Button>
        </div>
      </form>
    )
  }
  