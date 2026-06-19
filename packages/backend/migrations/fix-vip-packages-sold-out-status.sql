-- Migration: Reset sold_out status on VIP packages that have available inventory
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/unzfkcmmakyyjgruexpy/editor

UPDATE vip_packages
SET status = 'active'
WHERE status = 'sold_out'
  AND inventory_sold < inventory;
