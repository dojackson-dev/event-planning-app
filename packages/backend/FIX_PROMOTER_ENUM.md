# Fix: Add 'promoter' to user_role enum

The error "invalid input value for enum user_role: 'promoter'" occurs because the PostgreSQL `user_role` enum doesn't have 'promoter' as a valid value yet.

## Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
Go to: https://app.supabase.com/project/unzfkcmmakyyjgruexpy/sql/new

### Step 2: Execute This SQL

Copy and paste **EXACTLY** this SQL into the editor:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'promoter'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'promoter';
    RAISE NOTICE 'Added promoter to user_role enum';
  ELSE
    RAISE NOTICE 'promoter already exists in user_role enum';
  END IF;
END $$;
```

### Step 3: Click "RUN" button

Wait for confirmation. You should see:
```
✅ Success
Added promoter to user_role enum
```

## Done! 🎉

You can now:
1. ✅ Create promoter accounts from the homepage
2. ✅ Log in as a promoter
3. ✅ Access the promoter dashboard

## What This Does

This SQL adds 'promoter' as a valid enum value for the `user_role` column in PostgreSQL. The `DO` block checks if it already exists before adding, so it's safe to run multiple times.

## If You Still Get the Error

1. Hard refresh your browser: `Ctrl+Shift+R`
2. Clear browser cache
3. Try creating a promoter account again

## Alternative: Simpler SQL (if the above doesn't work)

If the SQL block has issues, try this simpler version:

```sql
ALTER TYPE user_role ADD VALUE 'promoter';
```

If you get an error saying it "already exists", that's fine - the enum already has the value and the issue is elsewhere.
