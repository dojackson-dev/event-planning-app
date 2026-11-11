-- Vendor catalog: items and packages vendors can list with prices (like venue Items & Packages),
-- optionally shown to clients, who can pick items when they request a booking.
-- Safe to run more than once. Run on the Supabase SQL editor for each environment.

CREATE TABLE IF NOT EXISTS public.vendor_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_account_id  uuid NOT NULL REFERENCES public.vendor_accounts(id) ON DELETE CASCADE,
  name               text NOT NULL,
  description        text,
  section            text,
  kind               text NOT NULL DEFAULT 'item' CHECK (kind IN ('item', 'package')),
  unit               text NOT NULL DEFAULT 'each' CHECK (unit IN ('each', 'hour', 'person', 'flat')),
  price              numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  hide_price         boolean NOT NULL DEFAULT false,
  image_url          text,
  is_active          boolean NOT NULL DEFAULT true,
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_items_vendor_idx
  ON public.vendor_items (vendor_account_id, section, sort_order);

-- Which items a package bundles (shown to clients; the package has one price of its own).
CREATE TABLE IF NOT EXISTS public.vendor_package_items (
  package_id  uuid NOT NULL REFERENCES public.vendor_items(id) ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES public.vendor_items(id) ON DELETE CASCADE,
  quantity    numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  PRIMARY KEY (package_id, item_id)
);

-- An item can be kept off the client menu while still available for the vendor's own estimates.
ALTER TABLE public.vendor_items
  ADD COLUMN IF NOT EXISTS visible_to_clients boolean NOT NULL DEFAULT true;

-- The vendor decides whether clients see the catalog at all.
ALTER TABLE public.vendor_accounts
  ADD COLUMN IF NOT EXISTS show_catalog_to_clients boolean NOT NULL DEFAULT false;

-- Items a client picked when requesting a booking (a snapshot of names and prices at that moment),
-- and the draft estimate the vendor created from the request.
ALTER TABLE public.vendor_booking_requests
  ADD COLUMN IF NOT EXISTS requested_items jsonb,
  ADD COLUMN IF NOT EXISTS estimate_id uuid;

ALTER TABLE public.vendor_estimates
  ADD COLUMN IF NOT EXISTS booking_request_id uuid;

-- All access goes through the backend with the service role; no direct client policies.
ALTER TABLE public.vendor_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_package_items ENABLE ROW LEVEL SECURITY;
