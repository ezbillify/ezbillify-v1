# IST Timezone Implementation Guide

## Overview
This application properly handles Indian Standard Time (IST, UTC+5:30) for all date and time operations, ensuring consistent storage in the database and accurate display to users.

## Key Components

### 1. Date Utilities (`src/lib/dateUtils.js`)

A comprehensive utility library for IST timezone handling:

- **`getCurrentISTTimestamp()`** - Get current timestamp in IST
- **`toISTTimestamp(dateInput)`** - Convert any date to IST timestamp
- **`formatISTDate(dateString, includeTime)`** - Format date in IST for display
- **`formatISTTime(dateString)`** - Format time only in IST
- **`dateInputToIST(dateString, timeString)`** - Convert user input to IST timestamp
- **`formatDateForInput(dateString)`** - Format date for HTML input fields
- **`isToday(dateString)`** - Check if date is today in IST
- **`getRelativeTime(dateString)`** - Get relative time (e.g., "2 hours ago")

### 2. Print Service (`src/services/printService.js`)

Updated to format dates and times in IST timezone:

```javascript
formatDate(dateString) {
  // Formats: "18 Nov 2025" in IST
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
}

formatTime(dateString) {
  // Formats: "02:30 PM" in IST
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}
```

### 3. Formatters Utility (`src/services/utils/formatters.js`)

General-purpose formatters for the application:

- **`formatDate()`** - Display dates in IST
- **`formatDateTime()`** - Display date and time in IST
- **`formatCurrency()`** - Format amounts in Indian Rupees
- **`formatPercentage()`** - Format percentage values

### 4. API Integration (`src/pages/api/sales/invoices/index.js`)

Invoice creation API now uses IST timestamps:

```javascript
import { getCurrentISTTimestamp } from '../../../../lib/dateUtils'

// When creating records
created_at: getCurrentISTTimestamp(),
updated_at: getCurrentISTTimestamp()
```

## How It Works

### Storage in Database
- All timestamps are stored in ISO 8601 format
- Supabase stores timestamps as UTC internally
- When we call `getCurrentISTTimestamp()`, it adjusts for IST offset (+5:30)

### Display to Users
- All date/time formatters use `timeZone: 'Asia/Kolkata'`
- This ensures dates are displayed in IST regardless of server timezone
- Invoices, reports, and UI all show consistent IST times

### User Input
- When users enter dates (e.g., invoice date), use `dateInputToIST()`
- This converts user input to proper IST timestamp for storage

## Usage Examples

### Creating a New Invoice

```javascript
import { getCurrentISTTimestamp } from '@/lib/dateUtils'

const invoice = {
  document_date: getCurrentISTTimestamp(),
  created_at: getCurrentISTTimestamp(),
  updated_at: getCurrentISTTimestamp()
}
```

### Displaying Dates in Components

```javascript
import { formatISTDate, formatISTTime } from '@/lib/dateUtils'

// In your component
<p>Date: {formatISTDate(invoice.document_date)}</p>
<p>Time: {formatISTTime(invoice.created_at)}</p>
<p>Full: {formatISTDate(invoice.document_date, true)}</p>
```

### Converting User Input

```javascript
import { dateInputToIST } from '@/lib/dateUtils'

// User enters date from input field
const userDate = '2025-11-18'
const userTime = '14:30'  // Optional

const istTimestamp = dateInputToIST(userDate, userTime)
// Store this in database
```

### Formatting for HTML Input

```javascript
import { formatDateForInput } from '@/lib/dateUtils'

// Convert database timestamp to input field value
const inputValue = formatDateForInput(invoice.document_date)
// Returns: "2025-11-18"
```

## Important Notes

1. **Always use IST utilities** - Don't use `new Date().toISOString()` directly
2. **Consistent timezone** - All formatters use 'Asia/Kolkata' timezone
3. **Database storage** - Store using `getCurrentISTTimestamp()` or `toISTTimestamp()`
4. **Display to users** - Use `formatISTDate()`, `formatISTTime()`, or `formatDateTime()`

## Invoice Template Display

The invoice templates automatically show IST times because:

1. `printService.js` uses IST-aware formatters
2. Template data includes formatted dates: `{{DOCUMENT_DATE}}` and `{{DOCUMENT_TIME}}`
3. All dates/times shown on invoices are in IST

## Testing IST Implementation

To verify IST is working correctly:

```javascript
import { getCurrentISTTimestamp, formatISTDate, formatISTTime } from '@/lib/dateUtils'

const now = getCurrentISTTimestamp()
console.log('IST Timestamp:', now)
console.log('Formatted Date:', formatISTDate(now))
console.log('Formatted Time:', formatISTTime(now))
console.log('Full DateTime:', formatISTDate(now, true))
```

## Migration Notes

### Existing Data
- Existing timestamps in database remain unchanged
- Display formatters automatically show them in IST
- No data migration needed

### Future Development
- Use `getCurrentISTTimestamp()` for all new records
- Use IST formatters for all date/time displays
- Always specify `timeZone: 'Asia/Kolkata'` in date formatters

## References

- JavaScript Date API: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
- Intl.DateTimeFormat: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
- IANA Timezone Database: https://www.iana.org/time-zones
