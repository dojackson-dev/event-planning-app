-- Message templates become per-owner. Run on every environment (demo first, then production).
-- Existing rows without an owner stay hidden; the API only returns an owner's own templates.
ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS owner_account_id uuid REFERENCES public.owner_accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_message_templates_owner_account
  ON public.message_templates(owner_account_id);

-- Backend uses the service role, so no client policies are needed.
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
