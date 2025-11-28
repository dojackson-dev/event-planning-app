# Database Migrations

This directory contains SQL migration files for setting up your Supabase database.

## Migration Order

Run these migrations in the following order:

1. **create-events-table.sql** - Creates the `event` table with RLS policies
2. **create-bookings-table.sql** - Creates the `booking` table with RLS policies (depends on `event` table)
3. **complete-intake-forms-table.sql** - Creates/updates the `intake_forms` table with RLS policies

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of each migration file
5. Click **Run** to execute
6. Repeat for each migration file in order

### Option 2: Using psql (Command Line)

```powershell
# Set your Supabase password
$env:PGPASSWORD = 'your-password-here'

# Run migrations in order
psql -h aws-0-us-east-1.pooler.supabase.com -U postgres.unzfkcmmakyyjgruexpy -d postgres -p 5432 -f migrations/create-events-table.sql
psql -h aws-0-us-east-1.pooler.supabase.com -U postgres.unzfkcmmakyyjgruexpy -d postgres -p 5432 -f migrations/create-bookings-table.sql
psql -h aws-0-us-east-1.pooler.supabase.com -U postgres.unzfkcmmakyyjgruexpy -d postgres -p 5432 -f migrations/complete-intake-forms-table.sql
```

## Table Descriptions

### `event` Table
Stores event information including:
- Event details (name, description, date, time)
- Venue and location
- Guest count
- Status (draft, scheduled, completed, cancelled)
- Budget information
- Owner/creator reference

**RLS**: Users can only view/edit their own events

### `booking` Table
Stores booking information including:
- User and event relationships
- Booking status (pending, confirmed, cancelled, completed)
- Payment information
- Contact details
- Confirmation and cancellation tracking

**RLS**: Users can only view/edit their own bookings

### `intake_forms` Table
Stores client intake form submissions including:
- Event type and date
- Contact information
- Service requirements
- Special requests and dietary restrictions
- Budget range
- Status tracking

**RLS**: Users can only view/edit their own intake forms

## Verification

After running migrations, verify tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('event', 'booking', 'intake_forms');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('event', 'booking', 'intake_forms');

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('event', 'booking', 'intake_forms');
```

## Troubleshooting

If you encounter authentication errors with psql:
1. Use the Supabase Dashboard SQL Editor instead
2. Verify your database credentials in your Supabase project settings
3. Check that your IP address is allowed in Supabase network settings

## Notes

- All tables use UUID for primary keys
- Row Level Security (RLS) is enabled on all tables
- Policies ensure users can only access their own data
- Timestamps are automatically managed with triggers
- Foreign key constraints ensure data integrity
