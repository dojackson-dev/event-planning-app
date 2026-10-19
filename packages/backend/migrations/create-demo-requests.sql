-- Demo requests from the public "Book a Demo" form. Shown to sales agents as leads they can claim.
-- Run on every environment (demo first, then production). Idempotent.
CREATE TABLE IF NOT EXISTS public.demo_requests (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT        NOT NULL,
  phone                    TEXT        NOT NULL,
  roles                    TEXT[]      NOT NULL DEFAULT '{}',
  description              TEXT,
  status                   TEXT        NOT NULL DEFAULT 'new'
                                       CHECK (status IN ('new', 'claimed', 'contacted', 'won', 'lost')),
  claimed_by_affiliate_id  UUID        REFERENCES public.affiliates(id) ON DELETE SET NULL,
  claimed_at               TIMESTAMPTZ,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_status_created
  ON public.demo_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_claimed_by
  ON public.demo_requests(claimed_by_affiliate_id);

-- Only the backend (service role) reads or writes this table.
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
