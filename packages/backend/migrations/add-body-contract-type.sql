-- Migration: add body and contract_type columns to contracts table
-- Run this in the Supabase SQL Editor

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'upload';
