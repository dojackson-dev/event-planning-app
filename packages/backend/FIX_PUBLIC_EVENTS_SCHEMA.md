# Fix Public Events Schema Errors

## Problem
Two errors preventing event creation:
1. **"Could not find a relationship between 'public_events' and 'ticket_tiers'"** - The tables don't exist or relationship isn't set up
2. **"Could not find a 'category' column of 'public_events'"** - The `public_events` table is missing required columns

## Root Cause
The `public_events`, `ticket_tiers`, and `tickets` tables haven't been created in the Supabase database yet.

## Solution
Run the SQL migration in Supabase to create these tables.

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project: https://app.supabase.com/projects
2. Select your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Create Migration
Click **"New Query"** and paste this SQL:

```sql
-- ================================================================
-- CREATE PUBLIC EVENTS AND TICKET SYSTEMS
-- ================================================================

-- Create enum for event status
DO $$
BEGIN
  CREATE TYPE event_status_type AS ENUM ('draft', 'published', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- public_events TABLE
CREATE TABLE IF NOT EXISTS public_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_account_id UUID NOT NULL REFERENCES promoter_accounts(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  venue_name VARCHAR(255),
  venue_address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  category VARCHAR(100),
  image_url TEXT,
  age_restriction VARCHAR(100),
  status event_status_type DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_events_promoter_account_id ON public_events(promoter_account_id);
CREATE INDEX IF NOT EXISTS idx_public_events_event_date ON public_events(event_date);
CREATE INDEX IF NOT EXISTS idx_public_events_status ON public_events(status);
CREATE INDEX IF NOT EXISTS idx_public_events_city ON public_events(city);
CREATE INDEX IF NOT EXISTS idx_public_events_category ON public_events(category);
CREATE INDEX IF NOT EXISTS idx_public_events_status_date ON public_events(status, event_date DESC);

-- ticket_tiers TABLE
CREATE TABLE IF NOT EXISTS ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_tiers_public_event_id ON ticket_tiers(public_event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tiers_price ON ticket_tiers(price);

-- tickets TABLE
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_event_id UUID NOT NULL REFERENCES public_events(id) ON DELETE CASCADE,
  ticket_tier_id UUID NOT NULL REFERENCES ticket_tiers(id) ON DELETE CASCADE,
  buyer_email VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  amount_paid DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'valid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_public_event_id ON tickets(public_event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_tier_id ON tickets(ticket_tier_id);
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_email ON tickets(buyer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_session_id ON tickets(stripe_checkout_session_id);

-- Enable RLS
ALTER TABLE public_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_events
CREATE POLICY "Promoters can view their own events" ON public_events
  FOR SELECT
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Promoters can create events" ON public_events
  FOR INSERT
  WITH CHECK (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Promoters can update their own events" ON public_events
  FOR UPDATE
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Promoters can delete their own events" ON public_events
  FOR DELETE
  USING (
    promoter_account_id IN (
      SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view published events" ON public_events
  FOR SELECT
  USING (status = 'published');

-- RLS Policies for ticket_tiers
CREATE POLICY "Promoters can manage their event's ticket tiers" ON ticket_tiers
  FOR ALL
  USING (
    public_event_id IN (
      SELECT id FROM public_events 
      WHERE promoter_account_id IN (
        SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Anyone can view ticket tiers for published events" ON ticket_tiers
  FOR SELECT
  USING (
    public_event_id IN (
      SELECT id FROM public_events WHERE status = 'published'
    )
  );

-- RLS Policies for tickets
CREATE POLICY "Promoters can view tickets for their events" ON tickets
  FOR SELECT
  USING (
    public_event_id IN (
      SELECT id FROM public_events 
      WHERE promoter_account_id IN (
        SELECT id FROM promoter_accounts WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tickets can be created for checkout sessions" ON tickets
  FOR INSERT
  WITH CHECK (true);
```

### Step 3: Execute
Click the **blue "Run"** button or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

You should see a message: "Success. No rows returned" or similar confirmation.

### Step 4: Verify
Run this query to confirm tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('public_events', 'ticket_tiers', 'tickets')
ORDER BY table_name;
```

Expected result: 3 rows (public_events, ticket_tiers, tickets)

## After Running Migration
1. Refresh the frontend app
2. Try creating a new event again
3. Both errors should be resolved:
   - ✅ `category` column now exists
   - ✅ `ticket_tiers` relationship is established

## Tables Created

### public_events
- **id** (UUID) - Primary key
- **promoter_account_id** (UUID FK) - Links to promoter_accounts
- **title** (VARCHAR 255) - Event name
- **category** (VARCHAR 100) - Event category (Music, Comedy, etc.)
- **event_date** (DATE) - When event occurs
- **start_time** (TIME) - Start time
- **end_time** (TIME) - End time
- **venue_name** (VARCHAR 255) - Venue name
- **venue_address** (TEXT) - Full venue address
- **city** (VARCHAR 100) - City location
- **state** (VARCHAR 100) - State
- **age_restriction** (VARCHAR 100) - 18+, 21+, all_ages
- **description** (TEXT) - Event description
- **image_url** (TEXT) - Event poster URL
- **status** (ENUM) - draft, published, or cancelled
- **created_at** (TIMESTAMP) - Creation time
- **updated_at** (TIMESTAMP) - Last update time

### ticket_tiers
- **id** (UUID) - Primary key
- **public_event_id** (UUID FK) - Links to public_events
- **name** (VARCHAR 255) - Tier name (e.g., "General Admission")
- **price** (DECIMAL) - Ticket price
- **quantity** (INTEGER) - Total tickets available
- **quantity_sold** (INTEGER) - Tickets already sold
- **description** (TEXT) - Tier description
- **created_at** (TIMESTAMP)
- **updated_at** (TIMESTAMP)

### tickets
- **id** (UUID) - Primary key
- **public_event_id** (UUID FK) - Event ticket is for
- **ticket_tier_id** (UUID FK) - Which tier was purchased
- **buyer_email** (VARCHAR 255) - Who bought it
- **stripe_checkout_session_id** (VARCHAR 255) - Payment reference
- **amount_paid** (DECIMAL) - Amount charged
- **status** (VARCHAR 50) - valid or other status
- **created_at** (TIMESTAMP)
