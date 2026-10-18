-- Sales tax the seller (promoter) charges on an event's tickets and VIP packages, as a percent.
-- EventEcos adds it as a separate line at checkout and passes it 100% to the promoter. Run on every environment.
ALTER TABLE public.public_events
  ADD COLUMN IF NOT EXISTS sales_tax_rate numeric(6,3) NOT NULL DEFAULT 0
  CHECK (sales_tax_rate >= 0 AND sales_tax_rate <= 20);

NOTIFY pgrst, 'reload schema';
