-- Add zip code, city/state, and estimated miles fields to load_reports

ALTER TABLE public.load_reports
  ADD COLUMN IF NOT EXISTS pickup_zip TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_zip TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pickup_city_state TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_city_state TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_miles INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.load_reports.pickup_zip IS 'Pickup location ZIP code';
COMMENT ON COLUMN public.load_reports.delivery_zip IS 'Delivery location ZIP code';
COMMENT ON COLUMN public.load_reports.pickup_city_state IS 'Pickup city and state resolved from ZIP (e.g. Chicago, IL)';
COMMENT ON COLUMN public.load_reports.delivery_city_state IS 'Delivery city and state resolved from ZIP (e.g. Houston, TX)';
COMMENT ON COLUMN public.load_reports.estimated_miles IS 'Driving distance in miles from pickup ZIP to delivery ZIP via Google Maps';
