# Vendors Feature - Database Migration Guide

## Overview
This document explains how to apply the vendors feature database migration to your Supabase project.

## Prerequisites
- Access to Supabase Dashboard for your project
- Database admin credentials (already have this)

## Option 1: Using Supabase Dashboard SQL Editor (Recommended)

### Steps:
1. **Go to Supabase Dashboard**
   - Open https://app.supabase.com
   - Select your project: `unzfkcmmakyyjgruexpy`

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy the Migration SQL**
   - Open `packages/backend/migrations/add-vendors.sql` in your editor
   - Copy the entire contents

4. **Paste and Execute**
   - Paste the SQL into the Supabase SQL Editor
   - Click "Run" button (or Cmd+Enter)
   - Wait for completion (should take 30-60 seconds)

5. **Verify Success**
   - You should see: "✓ X rows affected"
   - No errors should appear
   - Check the Tables view on the left to see new tables:
     - `vendor_accounts`
     - `vendor_bookings`
     - `vendor_reviews`
     - `vendor_gallery`

## Option 2: Using Script (If Above Fails)

1. **Navigate to backend**
   ```
   cd packages/backend
   ```

2. **Run migration script**
   ```
   node run-vendors-migration.js migrations/add-vendors.sql
   ```

3. **Check output**
   - Should see ✅ checkmarks for each statement
   - Note: Some "already exists" messages are normal

## What Gets Created

### Tables
- **vendor_accounts** - Vendor business profiles with location, pricing, social links
- **vendor_bookings** - When owners/clients book vendors for events
- **vendor_reviews** - Ratings and reviews for vendors
- **vendor_gallery** - Portfolio images for vendors

### Functions
- **search_vendors_by_location()** - Geo-search with haversine formula
- **search_venues_by_location()** - Geo-search for venues

### Column Additions to Existing Tables
- **venues** table gets: `latitude`, `longitude`, `zip_code`, `city`, `state`, `description`, `profile_image_url`, `website`, `is_public`

### Indexes
- Performance indexes on category, zip_code, location, dates

### Row-Level Security (RLS) Policies
- Public can view active vendors
- Vendors can manage their own account
- Vendors can view/update their bookings
- Authenticated users can create bookings
- Users can create/view reviews
- Gallery is public, but only vendors can edit their own

## Testing After Migration

### 1. Verify Tables Exist
```sql
-- Run this in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'vendor%';
```

Expected result:
```
vendor_accounts
vendor_bookings
vendor_reviews
vendor_gallery
```

### 2. Verify Functions
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%vendor%';
```

Expected result:
```
search_vendors_by_location
search_venues_by_location
```

### 3. Test Geo-Search Function
```sql
-- Test with San Francisco coordinates
SELECT id, business_name, distance_miles 
FROM search_vendors_by_location(37.7749, -122.4194, 30)
LIMIT 5;
```

## Troubleshooting

### "relation already exists"
- **Cause**: Tables were already created from a previous run
- **Solution**: Safe to ignore. The migration uses `IF NOT EXISTS` clauses.

### "function already exists"
- **Cause**: Functions were already created
- **Solution**: Safe to ignore. Functions are recreated with `CREATE OR REPLACE`.

### RLS Policy Errors
- **Cause**: Policies already exist
- **Solution**: Drop existing policies first or create unique policy names
- **Fix**: In Supabase Dashboard → Authentication → Policies → delete old ones before re-running

### Permission Denied
- **Cause**: Using wrong API key with insufficient permissions
- **Solution**: Ensure you're using the Service Key (not Anon key)
- **Verify**: In Settings → API Keys, copy the `service_role` key

## Next Steps

1. ✅ **Backend Ready** - Backend code is already implemented in `packages/backend/src/vendors/`

2. ✅ **Frontend Ready** - Frontend pages created:
   - `/vendors` - Directory with search
   - `/vendors/login` - Vendor login
   - `/vendors/register` - Vendor registration (3-step)
   - `/vendors/dashboard` - Vendor dashboard
   - `/vendors/[id]` - Vendor public profile
   - Dashboard updated with vendor booking link

3. **Start Frontend Dev Server**
   ```
   cd packages/frontend
   npm run dev
   ```
   Access at http://localhost:3000

4. **Test the Flow**
   - Visit http://localhost:3000/vendors to see directory
   - Click "List Your Business" to register as vendor
   - Create vendor account and profile
   - Login to vendor dashboard
   - View upcoming bookings

## Database Schema Summary

### vendor_accounts
```
id (UUID, PK)
user_id (references auth.users)
business_name
category (DJ, Decorator, Planner, etc.)
bio, website, instagram, phone, email
address, city, state, zip_code
latitude, longitude (for geo-search)
hourly_rate, flat_rate
profile_image_url, cover_image_url
is_active, is_verified
stripe_account_id, stripe_customer_id
created_at, updated_at
```

### vendor_bookings
```
id (UUID, PK)
vendor_account_id (references vendor_accounts)
owner_account_id (references owner_accounts, nullable)
event_id (references events, nullable)
booked_by_user_id (references auth.users)
event_name, event_date, start_time, end_time
venue_name, venue_address
status (pending, confirmed, declined, cancelled, completed)
agreed_amount, deposit_amount
payment_status (unpaid, deposit_paid, partially_paid, paid)
stripe_payment_intent_id
notes
created_at, updated_at
```

### vendor_reviews
```
id (UUID, PK)
vendor_account_id (references vendor_accounts)
reviewer_user_id (references auth.users)
vendor_booking_id (references vendor_bookings, nullable)
rating (1-5)
review_text
is_public
created_at
```

### vendor_gallery
```
id (UUID, PK)
vendor_account_id (references vendor_accounts)
image_url
caption
display_order
created_at
```

## API Endpoints

All endpoints are already implemented in the backend:

### Public Endpoints
- `GET /vendors/categories` - Available vendor categories
- `GET /vendors/search` - Geo-search with filters (zip/radius/category)
- `GET /vendors/public` - List all vendors
- `GET /vendors/:id` - Vendor profile
- `GET /vendors/:id/reviews` - Vendor reviews

### Authenticated Vendor Endpoints
- `POST /auth/flow/vendor/signup` - Register as vendor
- `POST /auth/flow/vendor/login` - Vendor login
- `POST /vendors/account` - Create vendor profile
- `GET /vendors/account/me` - Own vendor profile
- `PUT /vendors/account/me` - Update profile
- `GET /vendors/bookings/mine` - Vendor's bookings
- `PUT /vendors/bookings/:id` - Update booking status

### Authenticated Owner/Client Endpoints
- `POST /vendors/bookings` - Book a vendor
- `GET /vendors/bookings/owner` - Owner's vendor bookings
- `POST /vendors/reviews` - Leave review

## Support

If you encounter issues:
1. Check Supabase Status: https://status.supabase.com
2. Review error message in SQL Editor output
3. Check that auth.users table exists (it should from previous setup)
4. Ensure owner_accounts and events tables exist (they should)

Good luck! 🚀
