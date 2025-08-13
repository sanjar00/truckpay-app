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

export interface LoadReportsProps {
  onBack: () => void;
  user: { id: string } | null;
  userProfile: { companyDeduction?: number } | null;
  deductions: { type: string; isFixed?: boolean }[];
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
  rate: number;
  companyDeduction: number;
  locationFrom: string;
  locationTo: string;
  pickupDate: Date;
  deliveryDate: Date;
}

export interface DeleteConfirmation {
  type: 'load' | 'deduction';
  id: string;
}