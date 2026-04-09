-- Add lease_miles_cost column to weekly_mileage table
-- This stores the calculated cost for lease-operator drivers (total miles × lease rate per mile)
-- Only populated for lease-operator drivers, null for others

ALTER TABLE public.weekly_mileage
  ADD COLUMN IF NOT EXISTS lease_miles_cost DECIMAL(10,2) DEFAULT NULL;

COMMENT ON COLUMN public.weekly_mileage.lease_miles_cost IS 'Lease cost for the week (total miles × lease rate per mile). Only applicable for lease-operator drivers.';
