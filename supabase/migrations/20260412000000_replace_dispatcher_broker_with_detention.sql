-- Replace dispatcher, broker, and BOL fields with detention field
-- Detention is the amount added to the load's gross when driver waits >2 hours at pickup/dropoff

ALTER TABLE public.load_reports
  DROP COLUMN IF EXISTS dispatcher_name,
  DROP COLUMN IF EXISTS dispatcher_company,
  DROP COLUMN IF EXISTS dispatcher_phone,
  DROP COLUMN IF EXISTS broker_name,
  DROP COLUMN IF EXISTS broker_company,
  DROP COLUMN IF EXISTS bol_number,
  ADD COLUMN IF NOT EXISTS detention_amount DECIMAL(10, 2) DEFAULT NULL;

COMMENT ON COLUMN public.load_reports.detention_amount IS 'Detention pay (added to gross when driver waits >2 hours)';
