// hooks/useCalendar.js
import { useState, useCallback } from 'react'

export const useCalendar = (initialDate = new Date()) => {
  const [currentDate, setCurrentDate] = useState(initialDate)
  const [selectedDate, setSelectedDate] = useState(null)
  const [view, setView] = useState('month') // month, week, day

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const goToDate = useCallback((date) => {
    setCurrentDate(new Date(date))
  }, [])

  const goToPrevious = useCallback(() => {
    const newDate = new Date(currentDate)
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }, [currentDate, view])

  const goToNext = useCallback(() => {
    const newDate = new Date(currentDate)
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }, [currentDate, view])

  const formatDate = useCallback((date, format = 'default') => {
    const options = {
      default: { year: 'numeric', month: 'long', day: 'numeric' },
      short: { month: 'short', day: 'numeric' },
      long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    }
    
    return new Intl.DateTimeFormat('en-IN', options[format]).format(date)
  }, [])

  const getDaysInMonth = useCallback((date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()

    const days = []
    
    // Previous month's trailing days
    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: false
      })
    }

    // Current month's days
    const today = new Date()
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day)
      days.push({
        date: currentDate,
        isCurrentMonth: true,
        isToday: currentDate.toDateString() === today.toDateString()
      })
    }

    // Next month's leading days
    const remainingDays = 42 - days.length // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day)
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: false
      })
    }

    return days
  }, [])

  return {
    currentDate,
    selectedDate,
    view,
    setSelectedDate,
    setView,
    goToToday,
    goToDate,
    goToPrevious,
    goToNext,
    formatDate,
    getDaysInMonth
  }
}

export default useCalendar