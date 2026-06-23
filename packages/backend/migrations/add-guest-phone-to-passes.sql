-- ================================================================
-- ADD guest_phone TO vip_guest_passes
-- ================================================================
-- Run in Supabase SQL Editor (dashboard.supabase.com)
-- The backend selects guest_phone from this table — missing column
-- causes every VIP order lookup to fail with "VIP order not found".

ALTER TABLE vip_guest_passes
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;
