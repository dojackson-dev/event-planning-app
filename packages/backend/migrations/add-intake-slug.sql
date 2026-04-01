-- Add intake_slug to owner_accounts for friendly intake form URLs
-- e.g. dovenuesuite.com/intake/larrys-event-hall  instead of  /intake/<uuid>

ALTER TABLE owner_accounts
  ADD COLUMN IF NOT EXISTS intake_slug TEXT UNIQUE;

-- Back-fill existing owners: generate slug from business_name
-- Slugify: lowercase, replace non-alphanumeric runs with '-', strip leading/trailing '-'
UPDATE owner_accounts
SET intake_slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      business_name,
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '^-|-$', '', 'g'
  )
)
WHERE intake_slug IS NULL
  AND business_name IS NOT NULL
  AND business_name <> '';

-- For the rare case two businesses have the same slugified name, append their row id
-- (a run of this handles existing collisions; new ones are handled in the application layer)
UPDATE owner_accounts o
SET intake_slug = o.intake_slug || '-' || SUBSTRING(o.id::TEXT, 1, 6)
WHERE intake_slug IN (
  SELECT intake_slug
  FROM owner_accounts
  WHERE intake_slug IS NOT NULL
  GROUP BY intake_slug
  HAVING COUNT(*) > 1
);
