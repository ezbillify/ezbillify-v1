// hooks/usePagination.js
import { useState, useMemo } from 'react'

export const usePagination = (data, itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1)

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }, [data, currentPage, itemsPerPage])

  const totalPages = Math.ceil(data.length / itemsPerPage)
  const totalItems = data.length

  const goToPage = (page) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(pageNumber)
  }

  const goToNextPage = () => {
    goToPage(currentPage + 1)
  }

  const goToPreviousPage = () => {
    goToPage(currentPage - 1)
  }

  const goToFirstPage = () => {
    setCurrentPage(1)
  }

  const goToLastPage = () => {
    setCurrentPage(totalPages)
  }

  const resetPagination = () => {
    setCurrentPage(1)
  }

  return {
    currentPage,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    resetPagination,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  }
}

export default usePagination