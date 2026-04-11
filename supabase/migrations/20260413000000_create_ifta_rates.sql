-- IFTA quarterly diesel tax rates by state
-- Update this table each quarter when new rates are published at ifta.org
-- You can update directly via Supabase Dashboard → Table Editor → ifta_rates
-- No code deploy needed.

CREATE TABLE IF NOT EXISTS public.ifta_rates (
  state CHAR(2) NOT NULL,
  rate DECIMAL(6, 4) NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (state, year, quarter)
);

ALTER TABLE public.ifta_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ifta_rates"
  ON public.ifta_rates FOR SELECT TO authenticated USING (true);

-- Seed 2025 rates for all 4 quarters
-- Source: IFTA Inc. 2025 diesel tax rates ($/gallon)
-- Last verified: Q1 2025
WITH base_rates (state, rate) AS (
  VALUES
    ('AL'::CHAR(2), 0.2900::DECIMAL(6,4)),
    ('AZ'::CHAR(2), 0.2700::DECIMAL(6,4)),
    ('AR'::CHAR(2), 0.2850::DECIMAL(6,4)),
    ('CA'::CHAR(2), 0.6100::DECIMAL(6,4)),
    ('CO'::CHAR(2), 0.2050::DECIMAL(6,4)),
    ('CT'::CHAR(2), 0.4400::DECIMAL(6,4)),
    ('DE'::CHAR(2), 0.2200::DECIMAL(6,4)),
    ('FL'::CHAR(2), 0.3630::DECIMAL(6,4)),
    ('GA'::CHAR(2), 0.3260::DECIMAL(6,4)),
    ('ID'::CHAR(2), 0.3200::DECIMAL(6,4)),
    ('IL'::CHAR(2), 0.4670::DECIMAL(6,4)),
    ('IN'::CHAR(2), 0.5500::DECIMAL(6,4)),
    ('IA'::CHAR(2), 0.3250::DECIMAL(6,4)),
    ('KS'::CHAR(2), 0.2600::DECIMAL(6,4)),
    ('KY'::CHAR(2), 0.2680::DECIMAL(6,4)),
    ('LA'::CHAR(2), 0.2000::DECIMAL(6,4)),
    ('ME'::CHAR(2), 0.3120::DECIMAL(6,4)),
    ('MD'::CHAR(2), 0.4270::DECIMAL(6,4)),
    ('MA'::CHAR(2), 0.2400::DECIMAL(6,4)),
    ('MI'::CHAR(2), 0.2720::DECIMAL(6,4)),
    ('MN'::CHAR(2), 0.2850::DECIMAL(6,4)),
    ('MS'::CHAR(2), 0.1800::DECIMAL(6,4)),
    ('MO'::CHAR(2), 0.1700::DECIMAL(6,4)),
    ('MT'::CHAR(2), 0.2775::DECIMAL(6,4)),
    ('NE'::CHAR(2), 0.3480::DECIMAL(6,4)),
    ('NV'::CHAR(2), 0.2700::DECIMAL(6,4)),
    ('NH'::CHAR(2), 0.2220::DECIMAL(6,4)),
    ('NJ'::CHAR(2), 0.4890::DECIMAL(6,4)),
    ('NM'::CHAR(2), 0.2100::DECIMAL(6,4)),
    ('NY'::CHAR(2), 0.1755::DECIMAL(6,4)),
    ('NC'::CHAR(2), 0.3850::DECIMAL(6,4)),
    ('ND'::CHAR(2), 0.2300::DECIMAL(6,4)),
    ('OH'::CHAR(2), 0.4700::DECIMAL(6,4)),
    ('OK'::CHAR(2), 0.1900::DECIMAL(6,4)),
    ('OR'::CHAR(2), 0.3800::DECIMAL(6,4)),
    ('PA'::CHAR(2), 0.7410::DECIMAL(6,4)),
    ('RI'::CHAR(2), 0.3700::DECIMAL(6,4)),
    ('SC'::CHAR(2), 0.2600::DECIMAL(6,4)),
    ('SD'::CHAR(2), 0.2800::DECIMAL(6,4)),
    ('TN'::CHAR(2), 0.2740::DECIMAL(6,4)),
    ('TX'::CHAR(2), 0.2000::DECIMAL(6,4)),
    ('UT'::CHAR(2), 0.3190::DECIMAL(6,4)),
    ('VT'::CHAR(2), 0.3080::DECIMAL(6,4)),
    ('VA'::CHAR(2), 0.2620::DECIMAL(6,4)),
    ('WA'::CHAR(2), 0.4940::DECIMAL(6,4)),
    ('WV'::CHAR(2), 0.3570::DECIMAL(6,4)),
    ('WI'::CHAR(2), 0.3090::DECIMAL(6,4)),
    ('WY'::CHAR(2), 0.2400::DECIMAL(6,4))
)
INSERT INTO public.ifta_rates (state, rate, year, quarter)
SELECT state, rate, 2025, q
FROM base_rates
CROSS JOIN (VALUES (1), (2), (3), (4)) AS quarters(q)
ON CONFLICT (state, year, quarter) DO NOTHING;
