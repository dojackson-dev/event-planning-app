# Supabase Setup Guide

This guide will help you set up Supabase for the Event Planning App.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Enter your project details:
   - **Name**: Event Planning App
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for setup to complete

## Step 2: Run the Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the migration
6. Verify that all tables were created successfully in the **Table Editor**

## Step 3: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 4: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 5: Set Up Authentication

### Enable Email Auth

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Email** provider
3. Configure email templates (optional)

### Create Auth Trigger

To automatically create a user profile when someone signs up, run this SQL:

```sql
-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'),
    (NEW.raw_user_meta_data->>'tenant_id')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 6: Set Up Storage (for file uploads)

1. Go to **Storage** in Supabase dashboard
2. Create these buckets:
   - `contracts` - for contract documents
   - `insurance` - for insurance certificates  
   - `door-lists` - for door list files
   - `logos` - for tenant logos

3. Set bucket policies (public or private as needed)

## Step 7: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. The app should now connect to Supabase
3. Try signing up for an account to test auth

## Database Schema

The migration creates these main tables:

- **tenants** - Multi-tenant support
- **users** - User profiles (linked to auth.users)
- **events** - Event details
- **bookings** - Customer bookings
- **items** - Reusable items/services
- **payments** - Payment tracking
- **messages** - Chat messages
- **contracts** - Contract management
- **insurance** - Insurance certificates
- **door_lists** - Guest lists
- **security_assignments** - Security staff
- **intake_forms** - Client intake data

## Row Level Security (RLS)

The schema includes RLS policies to ensure:
- Users only see data for their tenant
- Customers only see their own bookings
- Owners/planners can see all tenant data

## Next Steps

After Supabase is set up:

1. Update `AuthContext` to use Supabase Auth
2. Replace API calls with Supabase queries
3. Test all features with real database
4. Deploy to production

## Useful Commands

### View all tables:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Check RLS policies:
```sql
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### View user profiles:
```sql
SELECT * FROM users;
```

## Troubleshooting

**Can't connect to Supabase?**
- Check your `.env.local` has correct URL and key
- Restart dev server after changing env vars

**RLS blocking queries?**
- Make sure you're authenticated
- Check policy conditions match your user

**Migration errors?**
- Run each section separately to identify issues
- Check Supabase logs in dashboard

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
