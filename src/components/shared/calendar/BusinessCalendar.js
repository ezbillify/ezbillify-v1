// src/components/shared/calendar/BusinessCalendar.js
import React, { useState, useEffect } from 'react';
import Calendar from './Calendar';

const BusinessCalendar = ({ 
  events = [],
  onEventClick,
  onDateSelect,
  className = ''
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventsForDate, setEventsForDate] = useState([]);

  useEffect(() => {
    const filtered = events.filter(event => 
      event.date === selectedDate
    );
    setEventsForDate(filtered);
  }, [selectedDate, events]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    if (onDateSelect) onDateSelect(date);
  };

  const eventDates = events.map(event => event.date);

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'invoice': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'payment': return 'bg-green-100 text-green-800 border-green-300';
      case 'bill': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'tax': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className={`grid md:grid-cols-3 gap-6 ${className}`}>
      {/* Calendar */}
      <div className="md:col-span-2">
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          highlightedDates={eventDates}
        />
      </div>
      
      {/* Events List */}
      <div className="bg-white/90 backdrop-blur-sm border-2 border-slate-200 rounded-xl shadow-sm p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Events for {new Date(selectedDate).toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          })}
        </h3>
        
        {eventsForDate.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-slate-500">No events for this date</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {eventsForDate.map((event, index) => (
              <button
                key={index}
                onClick={() => onEventClick && onEventClick(event)}
                className={`
                  w-full text-left p-3 rounded-lg border-2 transition-all duration-200
                  ${getEventTypeColor(event.type)}
                  hover:shadow-md
                `}
              >
                <div className="font-medium">{event.title}</div>
                {event.description && (
                  <div className="text-sm mt-1 opacity-80">{event.description}</div>
                )}
                {event.amount && (
                  <div className="text-sm font-semibold mt-2">₹{event.amount.toLocaleString('en-IN')}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessCalendar;