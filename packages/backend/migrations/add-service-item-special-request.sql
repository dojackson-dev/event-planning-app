-- Migration: Add special request and notes to service items and service orders
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

-- Allow promoters to configure a custom special-request prompt on any service item
-- (e.g. "Wings" → prompt: "Which flavor? Buffalo / Lemon Pepper / Garlic Parmesan")
-- and add an internal notes field visible to staff/promoter only.

ALTER TABLE vip_service_items
  ADD COLUMN IF NOT EXISTS allow_special_request  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_request_prompt TEXT,
  ADD COLUMN IF NOT EXISTS notes                  TEXT;

-- Store the guest's actual special-request response on the order line item
ALTER TABLE vip_service_orders
  ADD COLUMN IF NOT EXISTS special_request TEXT;
