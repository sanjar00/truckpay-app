-- Create load_reports table
CREATE TABLE public.load_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  rate DECIMAL(10,2) NOT NULL CHECK (rate > 0),
  company_deduction DECIMAL(5,2) NOT NULL CHECK (company_deduction >= 0 AND company_deduction <= 100),
  driver_pay DECIMAL(10,2) NOT NULL CHECK (driver_pay >= 0),
  location_from TEXT NOT NULL,
  location_to TEXT NOT NULL,
  date_added TIMESTAMP WITH TIME ZONE NOT NULL,
  week_period TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.load_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for load_reports table
CREATE POLICY "Users can view their own load reports" 
  ON public.load_reports 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own load reports" 
  ON public.load_reports 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own load reports" 
  ON public.load_reports 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own load reports" 
  ON public.load_reports 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_load_reports_user_id ON public.load_reports(user_id);
CREATE INDEX idx_load_reports_date_added ON public.load_reports(date_added);
CREATE INDEX idx_load_reports_user_date ON public.load_reports(user_id, date_added);