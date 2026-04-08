-- Restore Admin Fee fixed deductions for all weeks from Jan 2026 to current
-- This restores the $120/week Admin Fee that was accidentally deleted

-- Insert Admin Fee deductions for all weeks starting from when data was first entered
-- We'll backfill from the earliest load report to the current week
INSERT INTO deductions (user_id, type, amount, is_fixed, is_custom_type, date_added, created_at)
SELECT DISTINCT
  lr.user_id,
  'Admin Fee'::text as type,
  120.00 as amount,
  true as is_fixed,
  true as is_custom_type,
  (date_trunc('week', lr.date_added::timestamp) AT TIME ZONE 'UTC')::date::timestamp with time zone as date_added,
  NOW() as created_at
FROM load_reports lr
WHERE lr.date_added >= '2026-01-01'::date
  -- Only restore for users who had loads before the deletion
  AND NOT EXISTS (
    -- Exclude if an Admin Fee with is_fixed=true already exists for that week
    SELECT 1 FROM deductions d
    WHERE d.user_id = lr.user_id
      AND d.type = 'Admin Fee'
      AND d.is_fixed = true
      AND (date_trunc('week', d.date_added::timestamp) AT TIME ZONE 'UTC')::date = (date_trunc('week', lr.date_added::timestamp) AT TIME ZONE 'UTC')::date
  )
ON CONFLICT DO NOTHING;

-- Also ensure the current week has the Admin Fee if it doesn't already
INSERT INTO deductions (user_id, type, amount, is_fixed, is_custom_type, date_added, created_at)
SELECT DISTINCT
  lr.user_id,
  'Admin Fee'::text as type,
  120.00 as amount,
  true as is_fixed,
  true as is_custom_type,
  (date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))::date::timestamp with time zone as date_added,
  NOW() as created_at
FROM load_reports lr
WHERE lr.date_added >= '2026-01-01'::date
  AND NOT EXISTS (
    SELECT 1 FROM deductions d
    WHERE d.user_id = lr.user_id
      AND d.type = 'Admin Fee'
      AND d.is_fixed = true
      AND (date_trunc('week', d.date_added::timestamp) AT TIME ZONE 'UTC')::date = (date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))::date
  )
ON CONFLICT DO NOTHING;
