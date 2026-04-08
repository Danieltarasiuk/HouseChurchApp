-- One-time migration: Clear stale city-center coordinates
-- These coordinates were generated from city+zip before the street address fix.
-- Run this BEFORE triggering a PCO sync so members get re-geocoded with full street addresses.
--
-- Usage: Run against Neon DB, then trigger PCO sync from Settings page.

-- Clear member coordinates that were generated without street addresses
UPDATE members
SET latitude = NULL, longitude = NULL
WHERE address_street IS NOT NULL
  AND address_street != ''
  AND latitude IS NOT NULL;

-- Also clear HC coordinates so they get re-geocoded with latest address data
UPDATE house_churches
SET latitude = NULL, longitude = NULL
WHERE latitude IS NOT NULL
  AND (address_street IS NOT NULL AND address_street != ''
       OR address_city IS NOT NULL AND address_city != '');
