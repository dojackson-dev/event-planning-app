-- Migration: Add buyer_name to tickets table
-- Captures the ticket purchaser's name so it can be shown in the promoter's attendee list.
-- Run this in the Supabase SQL Editor.

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS buyer_name TEXT;
