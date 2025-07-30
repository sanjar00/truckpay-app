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
  user: any;
  userProfile: any;
  deductions: any[];
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