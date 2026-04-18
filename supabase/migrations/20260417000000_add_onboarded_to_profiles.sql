-- Track whether a user has completed the first-run onboarding carousel.
-- Defaults to false for new rows; existing users are backfilled to true
-- so returning drivers never see the onboarding again.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles SET onboarded = true WHERE onboarded = false;

ALTER TABLE public.profiles
  ALTER COLUMN onboarded SET DEFAULT false;
