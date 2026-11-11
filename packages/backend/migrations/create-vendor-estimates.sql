-- Vendor estimates: itemized quotes a vendor sends to a client, which can be approved and then
-- converted into an itemized invoice. Safe to run more than once.
-- Run on the Supabase SQL editor for each environment.

CREATE TABLE IF NOT EXISTS public.vendor_estimates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_account_id     uuid NOT NULL REFERENCES public.vendor_accounts(id) ON DELETE CASCADE,
  estimate_number       text NOT NULL UNIQUE,
  public_token          uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  client_name           text NOT NULL,
  client_email          text,
  client_phone          text,
  issue_date            date NOT NULL,
  expiration_date       date NOT NULL,
  subtotal              numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate              numeric(6,3)  NOT NULL DEFAULT 0,
  tax_amount            numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount       numeric(12,2) NOT NULL DEFAULT 0,
  total_amount          numeric(12,2) NOT NULL DEFAULT 0,
  notes                 text,
  terms                 text,
  status                text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'sent', 'viewed', 'approved', 'rejected', 'converted')),
  vendor_booking_id     uuid,
  converted_invoice_id  uuid,
  sent_at               timestamptz,
  viewed_at             timestamptz,
  responded_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_estimates_vendor_idx
  ON public.vendor_estimates (vendor_account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.vendor_estimate_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_estimate_id  uuid NOT NULL REFERENCES public.vendor_estimates(id) ON DELETE CASCADE,
  description         text NOT NULL,
  quantity            numeric(12,3) NOT NULL DEFAULT 1,
  unit_price          numeric(12,2) NOT NULL DEFAULT 0,
  amount              numeric(12,2) NOT NULL DEFAULT 0,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_estimate_items_estimate_idx
  ON public.vendor_estimate_items (vendor_estimate_id, sort_order);

-- All access goes through the backend with the service role; no direct client policies.
ALTER TABLE public.vendor_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_estimate_items ENABLE ROW LEVEL SECURITY;
