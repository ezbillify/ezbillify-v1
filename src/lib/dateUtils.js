// src/lib/dateUtils.js
/**
 * Date/Time utilities for proper IST (Indian Standard Time) handling
 * IST is UTC+5:30
 */

/**
 * Get current date/time in IST as ISO string for database storage
 * @returns {string} ISO string in IST timezone
 */
export function getCurrentISTTimestamp() {
  const now = new Date();
  // Convert to IST by adding 5 hours 30 minutes offset
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const utcTime = now.getTime();
  const istTime = new Date(utcTime + istOffset);

  // Return as ISO string (will be stored as UTC in database but represents IST time)
  return istTime.toISOString();
}

/**
 * Convert a date string to IST timezone for storage
 * @param {string|Date} dateInput - Date to convert
 * @returns {string} ISO string representing IST time
 */
export function toISTTimestamp(dateInput) {
  if (!dateInput) return getCurrentISTTimestamp();

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return getCurrentISTTimestamp();

  return date.toISOString();
}

/**
 * Format date in IST for display
 * @param {string} dateString - ISO date string from database
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export function formatISTDate(dateString, includeTime = false) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const options = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = true;
  }

  return date.toLocaleString('en-IN', options);
}

/**
 * Format time only in IST
 * @param {string} dateString - ISO date string from database
 * @returns {string} Formatted time string (e.g., "02:30 PM")
 */
export function formatISTTime(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

/**
 * Get start of day in IST
 * @param {string|Date} dateInput - Date input
 * @returns {string} ISO string for start of day in IST
 */
export function getISTStartOfDay(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();

  // Get IST date components
  const istDateString = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istDateString);

  istDate.setHours(0, 0, 0, 0);
  return istDate.toISOString();
}

/**
 * Get end of day in IST
 * @param {string|Date} dateInput - Date input
 * @returns {string} ISO string for end of day in IST
 */
export function getISTEndOfDay(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();

  // Get IST date components
  const istDateString = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istDateString);

  istDate.setHours(23, 59, 59, 999);
  return istDate.toISOString();
}

/**
 * Convert user input date (YYYY-MM-DD) to IST timestamp for storage
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {string} timeString - Optional time string (HH:MM)
 * @returns {string} ISO string for database storage
 */
export function dateInputToIST(dateString, timeString = null) {
  if (!dateString) return getCurrentISTTimestamp();

  let fullDateString = dateString;

  if (timeString) {
    fullDateString = `${dateString}T${timeString}:00`;
  } else {
    fullDateString = `${dateString}T00:00:00`;
  }

  // Parse as IST
  const date = new Date(fullDateString);

  // Adjust for IST offset (subtract 5:30 to get UTC)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcTime = date.getTime() - istOffset;

  return new Date(utcTime).toISOString();
}

/**
 * Format date for input field (YYYY-MM-DD)
 * @param {string} dateString - ISO date string
 * @returns {string} Date in YYYY-MM-DD format
 */
export function formatDateForInput(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  // Get date in IST
  const istDateString = date.toLocaleString('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return istDateString.split(',')[0]; // Returns YYYY-MM-DD
}

/**
 * Check if a date is today in IST
 * @param {string} dateString - ISO date string
 * @returns {boolean}
 */
export function isToday(dateString) {
  if (!dateString) return false;

  const date = new Date(dateString);
  const today = new Date();

  const dateIST = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayIST = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  return dateIST === todayIST;
}

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export function getRelativeTime(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatISTDate(dateString);
}

/**
 * Convert document date from frontend to proper timestamp
 * If only date is provided (YYYY-MM-DD), adds current IST time
 * If datetime is provided, returns as-is
 * @param {string} dateString - Date string from frontend (YYYY-MM-DD or ISO string)
 * @returns {string} ISO timestamp that will display correctly in IST
 */
export function ensureDocumentDateTime(dateString) {
  if (!dateString) return getCurrentISTTimestamp();

  // Check if it's date-only format (YYYY-MM-DD)
  if (!dateString.includes('T')) {
    // Get current IST date and time
    const now = new Date();

    // Get all IST components (date + time)
    const istFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = istFormatter.formatToParts(now);
    const istYear = parts.find(p => p.type === 'year').value;
    const istMonth = parts.find(p => p.type === 'month').value;
    const istDay = parts.find(p => p.type === 'day').value;
    const istHours = parts.find(p => p.type === 'hour').value;
    const istMinutes = parts.find(p => p.type === 'minute').value;
    const istSeconds = parts.find(p => p.type === 'second').value;

    // Use the user's selected date, but with current IST time
    // Parse the user's date
    const [userYear, userMonth, userDay] = dateString.split('-');

    // Create IST datetime string: user's date + current IST time
    const istDateTimeString = `${userYear}-${userMonth}-${userDay}T${istHours}:${istMinutes}:${istSeconds}+05:30`;

    // Parse as ISO string with IST timezone offset
    const date = new Date(istDateTimeString);

    return date.toISOString();
  }

  // Already has time component
  return dateString;
}
