-- Add new driver type fields to profiles
-- driver_type now supports: 'owner-operator', 'lease-operator', 'company-driver'
-- company_pay_type: how company drivers are paid ('per_mile' or 'percentage')
-- company_pay_rate: the $/mile or % value for company drivers
-- lease_rate_per_mile: the $/mile lease fee for lease-operators

ALTER TABLE public.profiles
  ALTER COLUMN driver_type DROP DEFAULT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_driver_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_driver_type_check
  CHECK (driver_type IN ('Solo', 'Team', 'owner-operator', 'lease-operator', 'company-driver'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lease_rate_per_mile DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS company_pay_type TEXT CHECK (company_pay_type IN ('per_mile', 'percentage')),
  ADD COLUMN IF NOT EXISTS company_pay_rate DECIMAL(8,4);

-- Update the trigger function to handle new fields on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, phone, driver_type, company_deduction,
    lease_rate_per_mile, company_pay_type, company_pay_rate
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'driver_type',
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'company_deduction', ''), '0')::DECIMAL,
    NULLIF(NEW.raw_user_meta_data ->> 'lease_rate_per_mile', '')::DECIMAL,
    NULLIF(NEW.raw_user_meta_data ->> 'company_pay_type', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'company_pay_rate', '')::DECIMAL
  );
  RETURN NEW;
END;
$$;
