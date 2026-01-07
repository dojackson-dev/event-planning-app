# Door List / Guest List Feature

## Overview
The Door List feature provides a secure, shareable guest list management system for events. It allows event owners to create guest lists that can be shared with clients, associates, and security personnel via unique links and access codes.

## Key Features

### 1. **Multi-Level Access Control**
- **Owner Access**: Full control over all guest lists
- **Security Access**: Can view and check in guests at the door
- **Client Access**: Can view and edit their own guest lists
- **Anonymous Access**: Anyone with the shareable link and access code can view/edit

### 2. **Shareable Links**
Each guest list automatically generates:
- **Edit Link**: For clients and associates to add/remove guests
- **Door List Link**: For security personnel to track arrivals
- **Access Code**: 6-character alphanumeric code required with links

### 3. **Guest Management**
- Add guests with name, phone, and plus-one count
- Set maximum plus-ones per guest
- Lock/unlock lists to prevent editing
- Track guest arrivals in real-time

## Database Schema

### Tables

#### `guest_lists`
- `id` - Primary key (SERIAL)
- `client_id` - UUID reference to users (owner of the list)
- `event_id` - UUID reference to events
- `max_guests_per_person` - INTEGER (max plus-ones allowed)
- `access_code` - VARCHAR(20) UNIQUE (6-char code for access)
- `share_token` - VARCHAR(255) UNIQUE (token for edit link)
- `arrival_token` - VARCHAR(255) UNIQUE (token for door list)
- `is_locked` - BOOLEAN (prevents editing when true)
- `created_at`, `updated_at` - Timestamps

#### `guests`
- `id` - Primary key (SERIAL)
- `guest_list_id` - INTEGER reference to guest_lists
- `name` - VARCHAR(255) (guest name)
- `phone` - VARCHAR(50) (guest phone)
- `plus_one_count` - INTEGER (number of additional guests)
- `has_arrived` - BOOLEAN (arrival status)
- `arrived_at` - TIMESTAMP (check-in time)
- `created_at`, `updated_at` - Timestamps

### Row Level Security (RLS) Policies

#### Guest Lists
- **Owner/Security View**: All authenticated users with 'owner', 'security', or 'planner' roles can view all lists
- **Client View**: Authenticated clients can view their own lists
- **Anonymous Access**: Anonymous users can access with valid tokens (validated in app layer)
- **Client Update**: Clients can update their own unlocked lists

#### Guests
- **Owner/Security View**: Can view all guests
- **Client View**: Can view guests in their own lists
- **Anonymous Access**: Can view/add/update guests (with code validation)
- **Client Manage**: Can add/update/delete guests in unlocked lists

## API Endpoints

### Guest Lists
- `GET /guest-lists` - Get all guest lists (owner only)
- `GET /guest-lists/:id` - Get specific guest list
- `GET /guest-lists/by-event/:eventId` - Get guest list for an event
- `GET /guest-lists/code/:code` - Get guest list by access code
- `GET /guest-lists/share/:token` - Get guest list by share token (public)
- `GET /guest-lists/arrival/:token` - Get guest list by arrival token (public)
- `POST /guest-lists` - Create new guest list
- `PUT /guest-lists/:id` - Update guest list
- `POST /guest-lists/:id/lock` - Lock guest list
- `POST /guest-lists/:id/unlock` - Unlock guest list
- `DELETE /guest-lists/:id` - Delete guest list
- `POST /guest-lists/validate-access` - Validate access code

### Guests
- `GET /guest-lists/:id/guests` - Get all guests in a list
- `POST /guest-lists/:id/guests` - Add guest to list
- `PUT /guest-lists/guests/:guestId` - Update guest
- `DELETE /guest-lists/guests/:guestId` - Remove guest
- `POST /guest-lists/guests/:guestId/arrive` - Mark guest as arrived
- `POST /guest-lists/guests/:guestId/unarrive` - Unmark guest arrival

## Frontend Routes

### Dashboard Routes (Authenticated)
- `/dashboard/guest-lists` - List all guest lists
- `/dashboard/guest-lists/new` - Create new guest list
- `/dashboard/guest-lists/[id]` - View/edit guest list details

### Public Routes (Anonymous with Code)
- `/guest-list/share/[token]` - Public guest list editor
- `/guest-list/arrival/[token]` - Public door list for check-ins

## User Flows

### 1. Creating a Guest List (Owner)
1. Navigate to `/dashboard/guest-lists`
2. Click "Create Guest List"
3. Select event and client
4. Set max plus-ones per guest
5. Guest list is created with auto-generated access code and tokens
6. Click "Share Link & Code" to view shareable information

### 2. Sharing with Client/Associates
1. Open guest list detail page
2. Click "Share Link & Code" button
3. Modal displays:
   - Access code (copy to clipboard)
   - Edit link (copy to clipboard)
   - Door list link (copy to clipboard)
4. Send access code and edit link to client via email/text
5. Recipients can access without login using code

### 3. Client Adding Guests (Anonymous)
1. Receive share link and access code from owner
2. Click share link
3. Enter 6-character access code
4. View event details and current guest list
5. Click "Add Guest" to add new entries
6. Fill in name, phone (optional), and plus-ones
7. Guests are added to the list immediately

### 4. Security Checking In Guests (Door List)
1. Receive arrival link and access code from owner
2. Click arrival link
3. Enter access code
4. See list of all expected guests with party sizes
5. Search for guest by name or phone
6. Click "Check In" when guest arrives
7. View real-time statistics (arrived vs total)
8. Click "Undo" if check-in was a mistake

## Security Features

1. **Access Code Required**: All anonymous access requires valid 6-character code
2. **Token-Based URLs**: Unique tokens prevent unauthorized access
3. **RLS Policies**: Database-level security ensures proper data isolation
4. **Lock Functionality**: Owners can lock lists to prevent editing
5. **Audit Trail**: Arrival timestamps track when guests were checked in

## Implementation Files

### Backend
- `packages/backend/migrations/enhance-guest-lists-for-doorlist.sql` - Database migration
- `packages/backend/src/guest-lists/guest-lists.service.ts` - Business logic
- `packages/backend/src/guest-lists/guest-lists.controller.ts` - API endpoints

### Frontend
- `packages/frontend/src/app/dashboard/guest-lists/page.tsx` - List view
- `packages/frontend/src/app/dashboard/guest-lists/[id]/page.tsx` - Detail view
- `packages/frontend/src/app/guest-list/share/[token]/page.tsx` - Public edit page
- `packages/frontend/src/app/guest-list/arrival/[token]/page.tsx` - Door list page
- `packages/frontend/src/components/ShareLinkModal.tsx` - Share modal component

## Setup Instructions

### 1. Apply Database Migration
Run the migration in your Supabase SQL Editor:
```bash
# Navigate to backend migrations
cd packages/backend/migrations

# Apply the migration file
cat enhance-guest-lists-for-doorlist.sql
```
Copy and paste the contents into Supabase SQL Editor and execute.

### 2. Verify Backend is Running
The guest-lists module should already be registered in the backend. Verify endpoints are accessible:
```bash
curl http://localhost:3001/guest-lists
```

### 3. Test the Feature
1. Create a guest list from the dashboard
2. Click "Share Link & Code" to get shareable links
3. Open share link in incognito window
4. Enter access code to verify anonymous access works
5. Test adding guests anonymously
6. Test door list with arrival tracking

## Future Enhancements

- [ ] SMS notifications when access code is generated
- [ ] QR code generation for quick access
- [ ] Guest self-check-in via mobile
- [ ] Guest list templates
- [ ] Export guest list to CSV/PDF
- [ ] Integration with event calendar
- [ ] Analytics dashboard (arrival patterns, etc.)
- [ ] Multiple access codes per list (different permissions)

## Troubleshooting

### Anonymous access not working
- Verify RLS policies are applied correctly
- Check that access code matches (case-insensitive)
- Ensure tokens are unique and not expired

### Guests not appearing
- Refresh the page
- Check browser console for API errors
- Verify backend is running on port 3001

### Cannot edit guest list
- Check if list is locked (lock icon appears)
- Verify you have permission (owner/client)
- Ensure backend allows anonymous POST requests

## Notes

- Access codes are case-insensitive but displayed in uppercase
- Share tokens and arrival tokens are separate for security
- Locked lists can still be viewed but not edited
- Owner and security can always access all lists
- Guest list is tied to an event and a client
