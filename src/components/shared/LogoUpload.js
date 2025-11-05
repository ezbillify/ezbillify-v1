// src/components/shared/LogoUpload.js
import { useState, useRef } from 'react'
import { FILE_LIMITS } from '../../lib/constants'

const LogoUpload = ({
  label,
  description,
  preview,
  onFileSelect,
  error,
  maxSize = FILE_LIMITS.LOGO_MAX_SIZE,
  allowedTypes = FILE_LIMITS.LOGO_ALLOWED_TYPES,
  required = false,
  helpText = 'PNG, JPG, or GIF up to 500KB'
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload PNG, JPG, or GIF'
      }
    }

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${formatFileSize(maxSize)}`
      }
    }

    return { valid: true, error: null }
  }

  const handleFileChange = (file) => {
    if (!file) return

    const validation = validateFile(file)

    if (!validation.valid) {
      onFileSelect(null, validation.error)
      return
    }

    onFileSelect(file, null)
  }

  const handleInputChange = (e) => {
    const file = e.target.files[0]
    handleFileChange(file)
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileChange(files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    onFileSelect(null, null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {description && (
        <p className="text-sm text-gray-500 mb-2">{description}</p>
      )}

      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative mt-1 flex justify-center px-6 pt-5 pb-6
          border-2 border-dashed rounded-lg cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : error
              ? 'border-red-300 bg-red-50 hover:border-red-400'
              : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <div className="space-y-2 text-center">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Logo preview"
                className="mx-auto h-32 w-32 object-contain mb-4 rounded"
                onError={(e) => {
                  console.error('❌ Failed to load logo image:', preview)
                  console.error('Error details:', e)
                }}
                onLoad={() => {
                  console.log('✅ Logo image loaded successfully:', preview)
                }}
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                aria-label="Remove logo"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          <div className="flex text-sm text-gray-600 justify-center">
            <span className="relative font-medium text-blue-600 hover:text-blue-500">
              {preview ? 'Change logo' : 'Upload logo'}
            </span>
            <p className="pl-1">or drag and drop</p>
          </div>

          <p className="text-xs text-gray-500">{helpText}</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept={allowedTypes.join(',')}
          onChange={handleInputChange}
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export default LogoUpload
