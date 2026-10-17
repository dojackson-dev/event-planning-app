-- ================================================================
-- PROMOTER TEAM: teammates (admin / staff) for a promoter account.
-- The account creator is promoter_accounts.user_id; only they can invite/remove.
-- Safe to re-run. Accessed only through the backend (service role).
-- ================================================================

CREATE TABLE IF NOT EXISTS promoter_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_account_id UUID NOT NULL REFERENCES promoter_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- A user belongs to at most one promoter team
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_promoter_team_members_account
  ON promoter_team_members(promoter_account_id);

CREATE TABLE IF NOT EXISTS promoter_team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_account_id UUID NOT NULL REFERENCES promoter_accounts(id) ON DELETE CASCADE,
  invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promoter_team_invitations_account
  ON promoter_team_invitations(promoter_account_id, status);

-- One pending invite per email per promoter account
CREATE UNIQUE INDEX IF NOT EXISTS uq_promoter_team_invitations_pending
  ON promoter_team_invitations(promoter_account_id, lower(email))
  WHERE status = 'pending';

-- RLS on with no policies: only the backend service role can read/write.
ALTER TABLE promoter_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_team_invitations ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
