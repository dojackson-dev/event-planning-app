# Grant Promoter Access to All Owner Accounts

This migration automatically grants promoter access to all existing owner accounts.

## What it does:

1. Creates the `promoter_accounts` table if it doesn't exist
2. Adds the 'promoter' role to the user_role enum
3. Inserts all existing owners into the `promoter_accounts` table
4. Adds the 'promoter' role to all owner users' roles array

## How to run:

### Option 1: Via Node.js script (Recommended)
```bash
cd packages/backend
node grant-owner-promoter-access.js
```

### Option 2: Via Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "+ New Query"
4. Copy and paste the contents of `migrations/grant-owner-promoter-access.sql`
5. Click "Run"

### Option 3: Via Terminal/psql
```bash
psql -h <your-db-host> -U postgres -d postgres < packages/backend/migrations/grant-owner-promoter-access.sql
```

## Verification:

After running the migration, owners should be able to:
- See the promoter dashboard at `/dashboard/promoter`
- Switch to promoter role without re-logging in
- Create and manage promoter events separately from owner events

## Rollback (if needed):

If you need to remove promoter access:
```sql
-- Remove promoter accounts for owners
DELETE FROM promoter_accounts WHERE owner_account_id IS NOT NULL;

-- Remove promoter role from users
UPDATE users
SET roles = array_remove(roles, 'promoter')
WHERE roles @> ARRAY['promoter']::text[];
```

## Database Changes:

- **New table**: `promoter_accounts`
- **Updated enum**: `user_role` (adds 'promoter' value)
- **Updated table**: `users` (roles array updated with 'promoter' value)
