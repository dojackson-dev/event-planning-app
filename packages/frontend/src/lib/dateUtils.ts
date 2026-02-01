/**
 * Parse a date string (YYYY-MM-DD) without timezone conversion.
 * This prevents the off-by-one day bug that occurs when using new Date('YYYY-MM-DD')
 * which interprets the date as UTC midnight and can shift to the previous day in local time.
 */
export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Format a time string (HH:MM or HH:MM:SS) to 12-hour format with AM/PM
 */
export const formatTime = (timeString: string | undefined): string => {
  if (!timeString) return 'Not set'
  
  // Parse time string (HH:MM or HH:MM:SS)
  const [hours, minutes] = timeString.split(':').slice(0, 2)
  const hour = parseInt(hours, 10)
  const min = minutes
  
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  
  return `${displayHour}:${min} ${ampm}`
}
