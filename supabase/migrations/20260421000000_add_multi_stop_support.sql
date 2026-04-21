-- ============================================================================
-- Multi-stop load support — ADDITIVE MIGRATION
-- ============================================================================
-- This migration is 100% additive. It does NOT modify any existing rows.
-- Single-stop loads (today's behavior) continue to work exactly as before:
--   load_reports.pickup_zip     = first pickup
--   load_reports.delivery_zip   = final delivery
--   A single-stop load has NO rows in load_stops.
--
-- Multi-stop loads store their INTERMEDIATE waypoints (between first pickup
-- and last delivery) as ordered rows in the new load_stops table.
--
-- Every existing load_reports row remains a valid A→B load because the new
-- stop_count column defaults to 2 (1 pickup + 1 delivery = current behavior).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Cached stop count on load_reports
--    2 = single-stop (pickup + delivery, no intermediate stops) — DEFAULT
--    3+ = multi-stop (pickup + N-2 intermediate stops + delivery)
-- ----------------------------------------------------------------------------
ALTER TABLE public.load_reports
  ADD COLUMN IF NOT EXISTS stop_count integer NOT NULL DEFAULT 2;

-- ----------------------------------------------------------------------------
-- 2. Cached total stop-off fees across all stops of this load.
--    Summed from load_stops.stop_off_fee. Zero for single-stop loads.
-- ----------------------------------------------------------------------------
ALTER TABLE public.load_reports
  ADD COLUMN IF NOT EXISTS total_stop_off_fees numeric NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 3. load_stops — intermediate waypoints only
--    For a load with stop_count = N, this table holds rows with sequence 2..N-1.
--    Sequence 1 (origin) lives in load_reports.pickup_zip/pickup_date/etc.
--    Sequence N (final destination) lives in load_reports.delivery_zip/delivery_date/etc.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.load_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid NOT NULL REFERENCES public.load_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence integer NOT NULL,                     -- position in the route (2..stop_count-1)
  stop_type text NOT NULL CHECK (stop_type IN ('pickup', 'delivery')),
  zip text,
  city_state text,
  scheduled_at timestamptz,                      -- optional date/time for this stop
  detention_amount numeric NOT NULL DEFAULT 0,   -- detention $ earned at this stop
  stop_off_fee numeric NOT NULL DEFAULT 0,       -- broker-paid per-stop charge
  leg_miles numeric,                             -- miles from previous stop to THIS stop (cached)
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT load_stops_sequence_positive CHECK (sequence >= 2),
  UNIQUE (load_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_load_stops_load_id ON public.load_stops(load_id);
CREATE INDEX IF NOT EXISTS idx_load_stops_user_id ON public.load_stops(user_id);

-- ----------------------------------------------------------------------------
-- 4. Row-Level Security — matches load_reports policy pattern
-- ----------------------------------------------------------------------------
ALTER TABLE public.load_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own load stops" ON public.load_stops;
CREATE POLICY "Users can view their own load stops"
  ON public.load_stops FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own load stops" ON public.load_stops;
CREATE POLICY "Users can insert their own load stops"
  ON public.load_stops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own load stops" ON public.load_stops;
CREATE POLICY "Users can update their own load stops"
  ON public.load_stops FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own load stops" ON public.load_stops;
CREATE POLICY "Users can delete their own load stops"
  ON public.load_stops FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. updated_at trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.load_stops_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS load_stops_updated_at ON public.load_stops;
CREATE TRIGGER load_stops_updated_at
  BEFORE UPDATE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.load_stops_touch_updated_at();

-- ----------------------------------------------------------------------------
-- NOTE: This migration contains NO UPDATE or DELETE statements against
-- existing rows. All existing load_reports rows retain their data unchanged.
-- New columns receive defaults (stop_count = 2, total_stop_off_fees = 0)
-- which correctly describe every existing load as a single-stop A→B load.
-- ----------------------------------------------------------------------------
