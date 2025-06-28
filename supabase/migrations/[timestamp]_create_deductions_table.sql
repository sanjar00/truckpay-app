-- Create deductions table
CREATE TABLE public.deductions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  is_fixed BOOLEAN NOT NULL DEFAULT false,
  is_custom_type BOOLEAN NOT NULL DEFAULT false,
  date_added TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  week_period TEXT, -- For fixed deductions, this can be null for recurring
  load_report_id UUID REFERENCES public.load_reports(id) ON DELETE CASCADE, -- For variable deductions tied to specific loads
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;

-- Create policies for deductions table
CREATE POLICY "Users can view their own deductions" 
  ON public.deductions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deductions" 
  ON public.deductions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deductions" 
  ON public.deductions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deductions" 
  ON public.deductions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_deductions_user_id ON public.deductions(user_id);
CREATE INDEX idx_deductions_type ON public.deductions(type);
CREATE INDEX idx_deductions_is_fixed ON public.deductions(is_fixed);
CREATE INDEX idx_deductions_user_type ON public.deductions(user_id, type);
CREATE INDEX idx_deductions_load_report ON public.deductions(load_report_id);

-- Create a table for custom deduction types
CREATE TABLE public.custom_deduction_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, type_name)
);

-- Enable Row Level Security for custom deduction types
ALTER TABLE public.custom_deduction_types ENABLE ROW LEVEL SECURITY;

-- Create policies for custom_deduction_types table
CREATE POLICY "Users can view their own custom deduction types" 
  ON public.custom_deduction_types 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom deduction types" 
  ON public.custom_deduction_types 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom deduction types" 
  ON public.custom_deduction_types 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom deduction types" 
  ON public.custom_deduction_types 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for custom deduction types
CREATE INDEX idx_custom_deduction_types_user_id ON public.custom_deduction_types(user_id);