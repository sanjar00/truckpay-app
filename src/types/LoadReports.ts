import { User } from '@supabase/supabase-js';
import { Tables } from '@/integrations/supabase/types';

export interface Load {
  id: string;
  rate: number;
  companyDeduction: number;
  driverPay: number;
  locationFrom: string;
  locationTo: string;
  pickupDate?: string;
  deliveryDate?: string;
  dateAdded: string;
  weekPeriod: string;
}

export interface UserProfile {
  name: string;
  phone: string | null;
  email: string | null;
  driverType: string;
  companyDeduction: number;
  weeklyPeriod: string;
  weeklyPeriodUpdatedAt?: string | null;
}

export type Deduction = {
  id: Tables<'deductions'>['Row']['id'];
  type: Tables<'deductions'>['Row']['type'];
  amount: Tables<'deductions'>['Row']['amount'];
  isFixed: Tables<'deductions'>['Row']['is_fixed'];
  isCustomType: Tables<'deductions'>['Row']['is_custom_type'];
  dateAdded: Tables<'deductions'>['Row']['date_added'];
};

export interface LoadReportsProps {
  onBack: () => void;
  user: User;
  userProfile: UserProfile | null;
  deductions: Deduction[];
}

export interface WeeklyMileage {
  startMileage: string;
  endMileage: string;
  totalMiles: number;
}

export interface ExtraDeduction {
  id: string;
  name: string;
  amount: string;
  dateAdded?: string;
}

export interface NewLoad {
  rate: string;
  companyDeduction: string;
  locationFrom: string;
  locationTo: string;
  pickupDate: Date | undefined;
  deliveryDate: Date | undefined;
}

export interface DeleteConfirmation {
  type: 'load' | 'deduction';
  id: string;
}