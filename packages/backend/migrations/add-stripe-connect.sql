-- Add Stripe Connect columns for owner payout accounts
ALTER TABLE owner_accounts
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected';
  -- stripe_connect_status: not_connected | pending | active

-- vendor_accounts already has stripe_account_id (used as connect ID)
-- Add status column for vendors
ALTER TABLE vendor_accounts
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected';
  -- stripe_connect_status: not_connected | pending | active

-- payments table for client→owner and owner→vendor transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('client_to_owner', 'owner_to_vendor')),
  amount_cents INTEGER NOT NULL,         -- total charged in cents
  fee_cents INTEGER NOT NULL,            -- DoVenueSuite 1.5% fee in cents
  stripe_fee_cents INTEGER,              -- estimated Stripe fee in cents
  net_cents INTEGER,                     -- recipient receives
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  -- relationships
  owner_account_id INTEGER REFERENCES owner_accounts(id) ON DELETE SET NULL,
  vendor_account_id UUID REFERENCES vendor_accounts(id) ON DELETE SET NULL,
  vendor_booking_id UUID REFERENCES vendor_bookings(id) ON DELETE SET NULL,
  booking_id UUID,                       -- client booking reference
  -- metadata
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_owner ON payments(owner_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_vendor ON payments(vendor_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
