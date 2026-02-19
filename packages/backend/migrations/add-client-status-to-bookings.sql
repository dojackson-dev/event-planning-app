-- Migration: Add client_status column to booking table
-- Run this in Supabase SQL Editor

DO $$ BEGIN
  CREATE TYPE client_status AS ENUM (
    'contacted_by_phone',
    'walkthrough_completed',
    'booked',
    'deposit_paid',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE booking
  ADD COLUMN IF NOT EXISTS client_status client_status DEFAULT 'contacted_by_phone';
