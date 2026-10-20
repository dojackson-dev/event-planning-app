-- A bank (ACH) payment leaves the invoice in 'processing' until it clears. The webhook tried to write that
-- status, but the status CHECK on these tables did not allow it, so the update failed and the invoice kept
-- offering Pay Now. This replaces the single-column status CHECK on each table with one that allows it.
-- Owner invoices use an enum instead of a CHECK. Run this statement on its own first.
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'processing';

DO $$
DECLARE
  t text;
  c record;
BEGIN
  FOREACH t IN ARRAY ARRAY['vendor_invoices', 'artist_invoices', 'promoter_invoices'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    FOR c IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_attribute att
        ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
      WHERE con.conrelid = ('public.' || t)::regclass
        AND con.contype = 'c'
        AND att.attname = 'status'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, c.conname);
    END LOOP;

    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (status IN (''draft'',''sent'',''viewed'',''processing'',''partial'',''paid'',''overdue'',''cancelled''))',
      t, t || '_status_check'
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
