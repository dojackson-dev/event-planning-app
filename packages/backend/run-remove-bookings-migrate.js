/**
 * Migration: Remove booking table, add booking-status columns to event table
 * Run once: node run-remove-bookings-migrate.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function migrate() {
  console.log('🚀 Starting booking → event migration...');

  const sql = `
    -- 1. Add booking-status columns to event table (safe: IF NOT EXISTS via DO block)
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='client_status') THEN
        ALTER TABLE event ADD COLUMN client_status TEXT DEFAULT 'new';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='payment_status') THEN
        ALTER TABLE event ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='deposit_amount') THEN
        ALTER TABLE event ADD COLUMN deposit_amount NUMERIC(10,2) DEFAULT 0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='deposit_paid') THEN
        ALTER TABLE event ADD COLUMN deposit_paid BOOLEAN DEFAULT FALSE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='deposit_paid_at') THEN
        ALTER TABLE event ADD COLUMN deposit_paid_at TIMESTAMPTZ;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='total_amount') THEN
        ALTER TABLE event ADD COLUMN total_amount NUMERIC(10,2) DEFAULT 0;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='client_confirmation_status') THEN
        ALTER TABLE event ADD COLUMN client_confirmation_status TEXT DEFAULT 'pending';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='confirmed_at') THEN
        ALTER TABLE event ADD COLUMN confirmed_at TIMESTAMPTZ;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='cancelled_at') THEN
        ALTER TABLE event ADD COLUMN cancelled_at TIMESTAMPTZ;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='cancellation_reason') THEN
        ALTER TABLE event ADD COLUMN cancellation_reason TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='special_requests') THEN
        ALTER TABLE event ADD COLUMN special_requests TEXT;
      END IF;
    END $$;

    -- 2. Add event_id to invoices if missing (already has intake_form_id, this is the direct link)
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='event_id') THEN
        ALTER TABLE invoices ADD COLUMN event_id UUID REFERENCES event(id) ON DELETE SET NULL;
      END IF;
    END $$;

    -- 3. Add event_id to estimates if missing
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='estimates' AND column_name='event_id') THEN
        ALTER TABLE estimates ADD COLUMN event_id UUID REFERENCES event(id) ON DELETE SET NULL;
      END IF;
    END $$;

    -- 4. Add event_id to contracts if missing
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='event_id') THEN
        ALTER TABLE contracts ADD COLUMN event_id UUID REFERENCES event(id) ON DELETE SET NULL;
      END IF;
    END $$;

    -- 5. Nullify booking_id FKs on invoices/estimates/contracts (make column nullable so old data stays)
    -- booking_id columns stay as nullable legacy columns for backward compat, just no longer required

    -- 6. Drop the booking table (all test data wiped)
    DROP TABLE IF EXISTS booking CASCADE;
  `;

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({ error: 'rpc_not_available' }));

  if (error === 'rpc_not_available' || error) {
    console.log('⚠️  exec_sql RPC not available — run this SQL directly in Supabase SQL editor:\n');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));
  } else {
    console.log('✅ Migration complete!');
  }
}

migrate().catch(console.error);
