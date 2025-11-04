// src/components/shared/data-display/Pagination.js - COMPLETE FIX FOR HIDDEN DROPDOWN
import React from 'react'
import Button from '../ui/Button'
import Select from '../ui/Select'

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
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' },
    { value: 100, label: '100' }
  ]

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
    <>
      <style jsx>{`
        .pagination-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .pagination-wrapper {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            gap: 1.5rem;
          }
        }

        .pagination-left {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: flex-start;
          width: 100%;
        }

        @media (min-width: 640px) {
          .pagination-left {
            flex-direction: row;
            gap: 1.5rem;
            width: auto;
            align-items: center;
          }
        }

        .items-info {
          font-size: 0.875rem;
          color: rgb(71, 85, 105);
          white-space: nowrap;
        }

        .items-info span {
          font-weight: 500;
        }

        .page-size-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
        }

        .page-size-selector-text {
          font-size: 0.875rem;
          color: rgb(71, 85, 105);
          white-space: nowrap;
        }

        .page-size-select {
          width: 80px;
          position: relative;
        }

        .pagination-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          justify-content: center;
          flex-wrap: wrap;
        }

        @media (min-width: 640px) {
          .pagination-right {
            width: auto;
            justify-content: flex-end;
          }
        }
      `}</style>

      <div className={`pagination-wrapper ${className}`}>
        {/* Left side: Items info and page size selector */}
        <div className="pagination-left">
          {showInfo && (
            <div className="items-info">
              <span>{totalItems}</span> invoice{totalItems !== 1 ? 's' : ''}
            </div>
          )}

          {showSizeSelector && (
            <div className="page-size-selector">
              <span className="page-size-selector-text">Show</span>
              <div className="page-size-select">
                <Select
                  value={itemsPerPage}
                  onChange={(value) => handleItemsPerPageChange(Number(value))}
                  options={pageSizeOptions}
                  size="sm"
                />
              </div>
              <span className="page-size-selector-text">per page</span>
            </div>
          )}
        </div>

        {/* Right side: Pagination controls */}
        {totalPages > 1 && (
          <div className="pagination-right">
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {getVisiblePages().map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`dots-${index}`} style={{ padding: '0.5rem 0.5rem', color: 'rgb(148, 163, 184)' }}>
                      ...
                    </span>
                  )
                }

                const isActive = page === currentPage

                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      borderRadius: '0.5rem',
                      backgroundColor: isActive ? 'rgb(37, 99, 235)' : 'transparent',
                      color: isActive ? 'white' : 'rgb(71, 85, 105)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 200ms',
                      boxShadow: isActive ? '0 4px 6px -1px rgba(59, 130, 246, 0.25)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.target.style.backgroundColor = 'rgb(226, 232, 240)'
                        e.target.style.color = 'rgb(15, 23, 42)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.target.style.backgroundColor = 'transparent'
                        e.target.style.color = 'rgb(71, 85, 105)'
                      }
                    }}
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
    </>
  )
}

// Specialized Pagination for EzBillify tables
export const InvoicePagination = ({ pagination, onPaginationChange }) => {
  return (
    <Pagination
      currentPage={pagination.page}
      totalPages={Math.ceil(pagination.totalItems / pagination.limit)}
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
    <div className="flex items-center justify-center gap-2">
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