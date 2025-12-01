-- Populate service items with default prices
-- This migration updates the default_price for service items that currently have 0 or NULL values

UPDATE service_items SET default_price = 2500 WHERE name = 'Facility Rental';
UPDATE service_items SET default_price = 500 WHERE name = 'Security Deposit';
UPDATE service_items SET default_price = 500 WHERE name = 'Sound System';
UPDATE service_items SET default_price = 750 WHERE name = 'A/V Equipment';
UPDATE service_items SET default_price = 1000 WHERE name = 'Planning Services';
UPDATE service_items SET default_price = 250 WHERE name = 'Additional Time';
UPDATE service_items SET default_price = 500 WHERE name = 'Hosting Services';
UPDATE service_items SET default_price = 0 WHERE name = 'Catering';
UPDATE service_items SET default_price = 0 WHERE name = 'Bar Services';
UPDATE service_items SET default_price = 0 WHERE name = 'Security Services';
UPDATE service_items SET default_price = 0 WHERE name = 'Decorations';
UPDATE service_items SET default_price = 0 WHERE name = 'Sales Tax';
UPDATE service_items SET default_price = 0 WHERE name = 'Items';
UPDATE service_items SET default_price = 0 WHERE name = 'Miscellaneous';

-- If the items don't exist yet, insert them (using CAST to match the enum type)
INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Facility Rental', 'Venue rental fee', 'facility_rental'::service_item_category, 2500, true, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Facility Rental');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Security Deposit', 'Refundable security deposit', 'security_deposit'::service_item_category, 500, true, 2, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Security Deposit');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Sound System', 'Professional sound system', 'sound_system'::service_item_category, 500, true, 3, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Sound System');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'A/V Equipment', 'Audio/visual equipment', 'av_equipment'::service_item_category, 750, true, 4, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'A/V Equipment');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Planning Services', 'Event planning and coordination', 'planning_services'::service_item_category, 1000, true, 5, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Planning Services');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Additional Time', 'Extended rental time per hour', 'additional_time'::service_item_category, 250, true, 6, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Additional Time');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Hosting Services', 'Professional event hosting', 'hosting_services'::service_item_category, 500, true, 7, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Hosting Services');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Catering', 'Food and beverage services', 'catering'::service_item_category, 0, true, 8, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Catering');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Bar Services', 'Bar setup and service', 'bar_services'::service_item_category, 0, true, 9, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Bar Services');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Security Services', 'Professional security personnel', 'security_services'::service_item_category, 0, true, 10, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Security Services');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Decorations', 'Event decorations', 'decorations'::service_item_category, 0, true, 11, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Decorations');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Sales Tax', 'Applicable sales tax', 'sales_tax'::service_item_category, 0, true, 12, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Sales Tax');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Items', 'Miscellaneous items', 'items'::service_item_category, 0, true, 13, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Items');

INSERT INTO service_items (name, description, category, default_price, is_active, sort_order, created_at, updated_at)
SELECT 'Miscellaneous', 'Other charges', 'misc'::service_item_category, 0, true, 14, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM service_items WHERE name = 'Miscellaneous');
