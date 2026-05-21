-- Migration: Add plan column to promoter_accounts
-- Tracks the promoter's subscription plan which determines the direct-payment platform fee.
-- Plans: 'free' (3%), 'pro' (1.5%), 'premium' (1%)
-- Run this in the Supabase SQL Editor.

ALTER TABLE promoter_accounts
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'premium'));
