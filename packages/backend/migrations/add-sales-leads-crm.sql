-- Sales portal leads CRM. Extends demo_requests (the leads table) and adds activity,
-- attachment, custom field and call script tables. Idempotent: safe to run more than once.
-- Run on every environment (demo first, then production) after create-demo-requests.sql.
-- Until this runs, the Leads tab keeps working with the original fields only.

ALTER TABLE public.demo_requests
  ADD COLUMN IF NOT EXISTS business_name           TEXT,
  ADD COLUMN IF NOT EXISTS email                   TEXT,
  ADD COLUMN IF NOT EXISTS website                 TEXT,
  ADD COLUMN IF NOT EXISTS city                    TEXT,
  ADD COLUMN IF NOT EXISTS state                   TEXT,
  ADD COLUMN IF NOT EXISTS lead_type               TEXT,
  ADD COLUMN IF NOT EXISTS source                  TEXT        NOT NULL DEFAULT 'demo_request',
  ADD COLUMN IF NOT EXISTS custom_fields           JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS next_follow_up_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contacted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_affiliate_id UUID        REFERENCES public.affiliates(id) ON DELETE SET NULL;

-- Match keys for duplicate detection. Generated, so the public Book a Demo form
-- and every existing row stay covered without any code populating them.
ALTER TABLE public.demo_requests
  ADD COLUMN IF NOT EXISTS phone_digits  TEXT GENERATED ALWAYS AS (right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10)) STORED,
  ADD COLUMN IF NOT EXISTS email_key     TEXT GENERATED ALWAYS AS (nullif(lower(btrim(coalesce(email, ''))), '')) STORED,
  ADD COLUMN IF NOT EXISTS business_key  TEXT GENERATED ALWAYS AS (nullif(lower(btrim(coalesce(business_name, ''))), '')) STORED;

CREATE INDEX IF NOT EXISTS idx_demo_requests_phone_digits  ON public.demo_requests(phone_digits);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email_key     ON public.demo_requests(email_key);
CREATE INDEX IF NOT EXISTS idx_demo_requests_business_key  ON public.demo_requests(business_key);
CREATE INDEX IF NOT EXISTS idx_demo_requests_follow_up     ON public.demo_requests(next_follow_up_at);

-- Timeline of calls, emails, texts, meetings and notes on a lead.
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID        NOT NULL REFERENCES public.demo_requests(id) ON DELETE CASCADE,
  affiliate_id  UUID        REFERENCES public.affiliates(id) ON DELETE SET NULL,
  type          TEXT        NOT NULL
                            CHECK (type IN ('note', 'call', 'email', 'sms', 'meeting', 'status_change', 'assignment', 'created')),
  direction     TEXT        CHECK (direction IN ('outbound', 'inbound')),
  subject       TEXT,
  body          TEXT,
  outcome       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities(lead_id, created_at DESC);

-- Files attached to a lead. The files live in the private lead-attachments bucket.
CREATE TABLE IF NOT EXISTS public.lead_attachments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID        NOT NULL REFERENCES public.demo_requests(id) ON DELETE CASCADE,
  affiliate_id  UUID        REFERENCES public.affiliates(id) ON DELETE SET NULL,
  file_name     TEXT        NOT NULL,
  storage_path  TEXT        NOT NULL,
  mime_type     TEXT,
  size_bytes    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_attachments_lead ON public.lead_attachments(lead_id);

-- Extra fields the sales manager defines for every lead. Values are kept in demo_requests.custom_fields.
CREATE TABLE IF NOT EXISTS public.lead_custom_fields (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key   TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  field_type  TEXT        NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'date', 'select')),
  options     TEXT[]      NOT NULL DEFAULT '{}',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Call and email talking points. {{name}} and {{business}} are filled in per lead.
CREATE TABLE IF NOT EXISTS public.sales_call_scripts (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    TEXT        NOT NULL,
  audience                 TEXT        NOT NULL DEFAULT 'any',
  body                     TEXT        NOT NULL,
  is_active                BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by_affiliate_id  UUID        REFERENCES public.affiliates(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only the backend (service role) reads or writes these tables.
ALTER TABLE public.lead_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_attachments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_call_scripts ENABLE ROW LEVEL SECURITY;

-- Private bucket for lead attachments (downloads use short-lived signed links).
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('lead-attachments', 'lead-attachments', FALSE)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Starter scripts for the people who help the business grow. Edit them from the portal.
INSERT INTO public.sales_call_scripts (title, audience, body)
SELECT 'Event owner / planner: first call', 'event_owner',
$script$Opening
Hi {{name}}, this is [your name] with EventEcos. Do you have a quick minute? I'm calling event owners and planners in your area.

Why I'm calling
EventEcos gives event owners one place to handle estimates, contracts, invoices and payments, and a client portal where your clients approve and pay online.

Questions
- How do you send estimates and collect deposits today?
- How many events or bookings are you handling in a typical month?
- What takes the most time between a client saying yes and the day of the event?

Close
I'd love to show you a 15 minute walkthrough of how {{business}} could use it. Would [day] or [day] work?

If they say they are busy: No problem. What is the best time for a quick call back, and is email okay for a short summary?$script$
WHERE NOT EXISTS (SELECT 1 FROM public.sales_call_scripts WHERE title = 'Event owner / planner: first call');

INSERT INTO public.sales_call_scripts (title, audience, body)
SELECT 'Caterer: first call', 'caterer',
$script$Opening
Hi {{name}}, this is [your name] with EventEcos. Is this a good time for a quick call?

Why I'm calling
Event owners on EventEcos book vendors right in the platform. Caterers get discovered by owners and can send invoices and get paid through the same place.

Questions
- How do you get most of your catering jobs right now?
- How do you send invoices and collect deposits?
- Do you work with venues or event planners regularly?

Close
I can help you set up a vendor profile for {{business}} so event owners can find and book you. Can I send the sign-up link to your email?

If they say they already have enough work: That's great. A profile keeps new bookings coming in without extra effort.$script$
WHERE NOT EXISTS (SELECT 1 FROM public.sales_call_scripts WHERE title = 'Caterer: first call');

INSERT INTO public.sales_call_scripts (title, audience, body)
SELECT 'Vendor: first call', 'vendor',
$script$Opening
Hi {{name}}, this is [your name] with EventEcos. Do you have a minute?

Why I'm calling
We connect event owners with vendors like {{business}}. Owners can find you, book you for an event, and pay your invoice online.

Questions
- What kind of events do you work most?
- How do you invoice clients and get paid today?
- How are new clients finding you?

Close
Would it help to have a vendor profile where event owners can find and book you? I can walk you through it in about 10 minutes.

Voicemail: Hi {{name}}, it's [your name] with EventEcos. I help vendors like {{business}} get booked by event owners and paid faster. I'll send a short email, and you can reach me at [your number].$script$
WHERE NOT EXISTS (SELECT 1 FROM public.sales_call_scripts WHERE title = 'Vendor: first call');

INSERT INTO public.sales_call_scripts (title, audience, body)
SELECT 'Follow-up email', 'any',
$script$Subject: Quick follow-up from EventEcos

Hi {{name}},

Thanks for taking my call. As promised, here is a short summary of how EventEcos can help {{business}}:
- Estimates, contracts, invoices and payments in one place
- A client portal where clients approve and pay online
- A way for event owners and vendors to find and book each other

Would [day] at [time] work for a 15 minute walkthrough?

[your name]
EventEcos$script$
WHERE NOT EXISTS (SELECT 1 FROM public.sales_call_scripts WHERE title = 'Follow-up email');

NOTIFY pgrst, 'reload schema';
