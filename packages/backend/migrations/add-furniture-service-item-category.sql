ALTER TYPE service_item_category ADD VALUE IF NOT EXISTS 'furniture';

NOTIFY pgrst, 'reload schema';
