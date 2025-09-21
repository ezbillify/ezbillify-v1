// src/components/shared/data-display/Pagination.js
import React from 'react'
import Button from '../ui/Button'

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  showSizeSelector = true,
  showInfo = true,
  className = ''
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const pageSizeOptions = [10, 25, 50, 100]

  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
    }
  }

  const handleItemsPerPageChange = (newItemsPerPage) => {
    const newTotalPages = Math.ceil(totalItems / newItemsPerPage)
    const newCurrentPage = Math.min(currentPage, newTotalPages)
    
    onItemsPerPageChange(newItemsPerPage)
    if (newCurrentPage !== currentPage) {
      onPageChange(newCurrentPage)
    }
  }

  if (totalPages <= 1 && !showInfo) return null

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 ${className}`}>
      {/* Items info and page size selector */}
      <div className="flex items-center space-x-4">
        {showInfo && (
          <div className="text-sm text-slate-600">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </div>
        )}

        {showSizeSelector && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="px-3 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-600">per page</span>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center space-x-2">
          {/* Previous button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            }
          >
            Previous
          </Button>

          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {getVisiblePages().map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`dots-${index}`} className="px-2 py-1 text-slate-400">
                    ...
                  </span>
                )
              }

              const isActive = page === currentPage

              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }
                  `}
                >
                  {page}
                </button>
              )
            })}
          </div>

          {/* Next button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            iconPosition="right"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            }
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

// Specialized Pagination for EzBillify tables
export const InvoicePagination = ({ pagination, onPaginationChange }) => {
  return (
    <Pagination
      currentPage={pagination.page}
      totalPages={pagination.totalPages}
      totalItems={pagination.totalItems}
      itemsPerPage={pagination.limit}
      onPageChange={(page) => onPaginationChange({ ...pagination, page })}
      onItemsPerPageChange={(limit) => onPaginationChange({ ...pagination, limit, page: 1 })}
      showInfo={true}
      showSizeSelector={true}
    />
  )
}

export const SimplePagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        }
      />
      
      <span className="px-4 py-2 text-sm font-medium text-slate-600">
        Page {currentPage} of {totalPages}
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        }
      />
    </div>
  )
}

export default Pagination
