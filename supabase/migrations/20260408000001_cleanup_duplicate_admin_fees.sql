-- Clean up duplicate Admin Fee records - keep only the earliest one per user
-- This removes the extra Admin Fee entries created by the restoration migration

DELETE FROM deductions
WHERE id IN (
  -- Find all Admin Fee records except the earliest one per user
  SELECT d.id
  FROM deductions d
  INNER JOIN (
    -- Get the earliest Admin Fee record for each user
    SELECT user_id, MIN(date_added) as earliest_date
    FROM deductions
    WHERE type = 'Admin Fee'
      AND is_fixed = true
    GROUP BY user_id
  ) earliest ON d.user_id = earliest.user_id
    AND d.type = 'Admin Fee'
    AND d.date_added > earliest.earliest_date
)
AND type = 'Admin Fee'
AND is_fixed = true;
