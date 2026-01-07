# Door List Feature - Quick Setup Guide

## What Was Created

This feature implements a complete door list/guest list management system with anonymous access via shareable links and codes.

## Files Created/Modified

### Database
- ✅ `packages/backend/migrations/enhance-guest-lists-for-doorlist.sql` - RLS policies for anonymous access

### Backend
- ✅ `packages/backend/src/guest-lists/guest-lists.service.ts` - Enhanced with access validation
- ✅ `packages/backend/src/guest-lists/guest-lists.controller.ts` - Added validate-access endpoint

### Frontend Components
- ✅ `packages/frontend/src/components/ShareLinkModal.tsx` - Modal for sharing links and codes
- ✅ `packages/frontend/src/app/dashboard/guest-lists/[id]/page.tsx` - Enhanced with share button
- ✅ `packages/frontend/src/app/guest-list/share/[token]/page.tsx` - Public guest list editor
- ✅ `packages/frontend/src/app/guest-list/arrival/[token]/page.tsx` - Door list for security

### Documentation
- ✅ `DOOR_LIST_FEATURE.md` - Complete feature documentation

## Setup Steps

### 1. Apply Database Migration

```sql
-- Run this in Supabase SQL Editor
-- File: packages/backend/migrations/enhance-guest-lists-for-doorlist.sql
```

The migration:
- Adds RLS policies for anonymous access
- Creates policies for security/owner access
- Adds validation function for access codes
- Enables proper multi-role access control

### 2. Verify Backend

The backend already has the guest-lists module. Just verify the new endpoint works:

```bash
curl -X POST http://localhost:3001/guest-lists/validate-access \
  -H "Content-Type: application/json" \
  -d '{"guestListId": 1, "accessCode": "ABC123"}'
```

### 3. Test Frontend

1. Start the frontend:
   ```bash
   cd packages/frontend
   npm run dev
   ```

2. Navigate to `/dashboard/guest-lists`
3. Create a new guest list
4. Click "Share Link & Code" to see the shareable information

### 4. Test Anonymous Access

1. Copy the share link and access code from the modal
2. Open the link in an incognito browser window
3. Enter the access code
4. Verify you can view and add guests
5. Test the door list link similarly

## How It Works

### Access Control Flow

```
Owner/Security (Authenticated)
   ↓
Creates Guest List
   ↓
System Generates:
  - Access Code (6 chars)
  - Share Token (edit link)
  - Arrival Token (door list)
   ↓
Owner Shares → Client/Associates/Security
   ↓
Recipients Access:
  - Link + Code = Full Access
  - No login required
  - RLS validates permissions
```

### Link Types

1. **Edit Link** (`/guest-list/share/[token]`)
   - For clients and associates
   - Can add/remove guests
   - Requires access code
   - Respects lock status

2. **Door List** (`/guest-list/arrival/[token]`)
   - For security personnel
   - Can check in guests
   - Shows arrival statistics
   - Real-time updates

### Security Features

- ✅ Access code required with all links
- ✅ RLS policies at database level
- ✅ Anonymous users can't bypass code check
- ✅ Locked lists prevent editing
- ✅ Owner/security always have access
- ✅ Audit trail via timestamps

## Usage Example

### For Owners:

1. **Create Guest List**
   - Go to Dashboard → Guest Lists
   - Click "Create Guest List"
   - Select event and client
   - Set max plus-ones

2. **Share with Client**
   - Open guest list detail
   - Click "Share Link & Code"
   - Copy access code: `XYZ789`
   - Copy edit link
   - Send both to client via email/SMS

3. **Share with Security**
   - Same guest list detail
   - Copy door list link
   - Send with same access code
   - Security can track arrivals

### For Clients (Anonymous):

1. **Receive Link & Code**
   - Get email/SMS with link and code
   - Click link

2. **Enter Access Code**
   - See access code entry screen
   - Type 6-character code
   - Click "Access Guest List"

3. **Manage Guests**
   - View event details
   - Click "Add Guest"
   - Fill in name, phone, plus-ones
   - Submit

### For Security (Anonymous):

1. **Access Door List**
   - Click door list link
   - Enter access code

2. **Check In Guests**
   - See list of expected guests
   - Search by name/phone
   - Click "Check In" when guest arrives
   - See real-time statistics

## Troubleshooting

### Migration Fails
- Check if guest_lists table already exists
- Verify you're running against correct database
- Drop old policies if they conflict

### Anonymous Access Not Working
- Verify RLS policies are applied
- Check browser console for errors
- Ensure backend allows CORS for anon requests

### Links Not Working
- Verify tokens are unique
- Check that guest list exists
- Ensure access code is correct (case-insensitive)

## Next Steps

1. **Apply the migration** in Supabase
2. **Test the feature** in development
3. **Train users** on sharing workflow
4. **Monitor usage** in production

## Support

For issues or questions:
1. Check the full documentation in `DOOR_LIST_FEATURE.md`
2. Review the API endpoints in the backend controller
3. Check RLS policies in the database migration file

---

**Feature Status**: ✅ Complete and Ready for Testing
