# Event Conflict Detection Implementation

## Overview
This document describes the event conflict detection system that prevents overlapping events at the same venue on the same date.

## Implementation Details

### 1. Backend - Production (Supabase)
**File:** `packages/backend/src/events/events.service.ts`

**Changes Made:**
- Added `timeToMinutes()` helper method to convert HH:mm time format to minutes
- Added `timesOverlap()` method to check if two time ranges overlap using the algorithm: `max(start1, start2) < min(end1, end2)`
- Added `checkConflicts()` private method that:
  - Queries the database for events on the same date and venue
  - Excludes the current event when updating (to allow saving without changes)
  - Identifies conflicting time slots
  - Throws `BadRequestException` with detailed conflict information

**Applied To:**
- `create()` method - checks conflicts before creating new events
- `update()` method - checks conflicts before updating events (excludes the event being updated)

### 2. Backend - Development (Local JSON)
**File:** `packages/backend/src/events/dev-events.controller.ts`

**Changes Made:**
- Extracted time overlap logic into `checkTimeConflicts()` helper method for reusability
- Updated `create()` endpoint to use the helper method (already had conflict detection)
- Updated `PATCH/:id` endpoint to:
  - Check for conflicts when updating date, venue, start time, or end time
  - Exclude the current event being updated from conflict check
  - Throw `BadRequestException` with specific conflict details

### 3. Frontend - Event Creation
**File:** `packages/frontend/src/app/dashboard/events/new/page.tsx`

**Current Implementation:**
- Error handling is already in place via try-catch
- Error messages from backend are displayed in the form via:
  ```tsx
  {error && (
    <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md">
      {error}
    </div>
  )}
  ```
- Users will see the conflict error message when trying to create a conflicting event

### 4. Frontend - Event Management/Editing
**File:** `packages/frontend/src/app/dashboard/events/[id]/manage/page.tsx`

**Changes Made:**
- Added `error` state to track error messages
- Updated `handleSave()` function to:
  - Clear error state before attempting save
  - Capture specific error messages from the API response
  - Display error message in the UI instead of just using alert()
- Added error alert component that displays:
  - Error icon and styling
  - Detailed error message
  - Close button to dismiss the error

## Conflict Detection Algorithm

The system detects conflicts using the standard interval overlap formula:

```
Two time ranges overlap if: max(start1, start2) < min(end1, end2)
```

**Example:**
- Event A: 14:00 - 16:00
- Event B: 15:00 - 17:00
- Overlap: max(14:00, 15:00) = 15:00 < min(16:00, 17:00) = 16:00 ✓ CONFLICT

- Event C: 16:00 - 18:00
- Event A: 14:00 - 16:00
- Overlap: max(14:00, 16:00) = 16:00 < min(16:00, 18:00) = 16:00 ✗ NO CONFLICT (back-to-back is allowed)

## Error Messages

When a conflict is detected, users receive a clear error message:

```
Cannot create event at this time. Conflicts with: [Event Name] ([start time]-[end time])
```

Multiple conflicts are listed:
```
Cannot create event at this time. Conflicts with: Sarah's Party (14:00-16:00), Company Meeting (15:30-17:00)
```

## Scope of Conflict Check

Conflicts are checked only when:
- Same **date** (YYYY-MM-DD format)
- Same **venue** (exact string match)
- **Time ranges** overlap

Events are **not** in conflict if they:
- Occur on different dates
- Occur at different venues
- Have back-to-back times (end time of one = start time of another)

## Features

✅ Prevents creation of conflicting events
✅ Prevents updates that would create conflicts
✅ Allows updating non-conflicting fields
✅ Allows back-to-back events at the same venue
✅ Clear, user-friendly error messages
✅ Works in both production (Supabase) and development (local) modes

## Testing

To test the conflict detection:

1. **Create an event:**
   - Name: "Event A"
   - Date: 2025-12-20
   - Venue: "Main Hall"
   - Time: 14:00 - 16:00

2. **Try to create a conflicting event:**
   - Name: "Event B"
   - Date: 2025-12-20
   - Venue: "Main Hall"
   - Time: 15:00 - 17:00
   - **Expected Result:** Error message appears

3. **Try to create a non-conflicting event:**
   - Name: "Event C"
   - Date: 2025-12-20
   - Venue: "Main Hall"
   - Time: 16:00 - 18:00 (back-to-back)
   - **Expected Result:** Event is created successfully

4. **Try to update with conflict:**
   - Edit "Event A"
   - Change time to: 15:30 - 17:30
   - **Expected Result:** Error message appears

## Database Notes

The system currently enforces conflict detection at the application level through the service/controller logic. This is sufficient for preventing conflicts during normal operation.

For additional data integrity, a PostgreSQL trigger could be added at the database level (optional future enhancement):
```sql
CREATE TRIGGER check_event_conflicts
BEFORE INSERT OR UPDATE ON event
FOR EACH ROW
EXECUTE FUNCTION check_time_conflict();
```

## Files Modified

1. `packages/backend/src/events/events.service.ts` - Added conflict detection logic
2. `packages/backend/src/events/dev-events.controller.ts` - Enhanced conflict checking for updates
3. `packages/frontend/src/app/dashboard/events/[id]/manage/page.tsx` - Added error state and display
