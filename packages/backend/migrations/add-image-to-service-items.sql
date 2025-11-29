-- Migration: Add image_url to service_items
-- Run this in Supabase SQL Editor

-- Add image_url column to service_items
ALTER TABLE service_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN service_items.image_url IS 'URL to item image. If NULL, use category-based fallback image.';
