-- Add extra fields to load_reports for IFTA, deadhead, and dispatcher/broker tracking

ALTER TABLE public.load_reports
  ADD COLUMN IF NOT EXISTS deadhead_miles INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS states_miles JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fuel_purchases JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dispatcher_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dispatcher_company TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dispatcher_phone TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS broker_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS broker_company TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bol_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Comment on new columns
COMMENT ON COLUMN public.load_reports.deadhead_miles IS 'Empty miles driven to reach pickup location';
COMMENT ON COLUMN public.load_reports.states_miles IS 'Array of {state, miles} for IFTA reporting';
COMMENT ON COLUMN public.load_reports.fuel_purchases IS 'Array of {state, gallons, pricePerGallon, amount} for IFTA reporting';
COMMENT ON COLUMN public.load_reports.dispatcher_name IS 'Dispatcher contact name';
COMMENT ON COLUMN public.load_reports.dispatcher_company IS 'Dispatcher company name';
COMMENT ON COLUMN public.load_reports.dispatcher_phone IS 'Dispatcher phone number';
COMMENT ON COLUMN public.load_reports.broker_name IS 'Broker name';
COMMENT ON COLUMN public.load_reports.broker_company IS 'Broker company name';
COMMENT ON COLUMN public.load_reports.bol_number IS 'Bill of Lading number';
COMMENT ON COLUMN public.load_reports.notes IS 'Load notes';
