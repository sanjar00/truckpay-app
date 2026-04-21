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
  deadheadMiles?: number;
  detentionAmount?: number;
  notes?: string;
  pickupZip?: string;
  deliveryZip?: string;
  pickupCityState?: string;
  deliveryCityState?: string;
  estimatedMiles?: number;

  // Multi-stop support (intermediate stops only; origin + final destination still live
  // in pickup_zip / delivery_zip on load_reports). stopCount defaults to 2 (A→B).
  stopCount?: number;
  totalStopOffFees?: number;
  stops?: LoadStop[]; // intermediate stops (sequence 2..stopCount-1), empty for A→B loads
}

/**
 * A single intermediate stop in a multi-stop load.
 * Sequence 1 = origin (in load_reports.pickup_*)
 * Sequence N = final destination (in load_reports.delivery_*)
 * Sequence 2..N-1 = rows in load_stops
 */
export interface LoadStop {
  id?: string;               // present when loaded from DB; undefined for in-flight new stops
  sequence: number;          // 2..stopCount-1
  stopType: 'pickup' | 'delivery';
  zip?: string;
  cityState?: string;
  scheduledAt?: string;      // ISO date string (YYYY-MM-DD) or full timestamptz
  detentionAmount?: number;
  stopOffFee?: number;
  legMiles?: number;         // miles from previous stop to this stop
  notes?: string;
}

/** Stop shape while the user is editing in AddLoadForm (strings for numeric inputs). */
export interface NewLoadStop {
  tempId: string;            // client-side key for React list
  existingId?: string;       // set when editing a load that already has this stop in DB
  stopType: 'pickup' | 'delivery';
  zip?: string;
  cityState?: string;
  scheduledAt?: Date;
  detentionAmount?: string;
  stopOffFee?: string;
  legMiles?: number;
  notes?: string;
}

export interface LoadReportsProps {
  onBack: () => void;
  user: any;
  userProfile: any;
  deductions: any[];
  onUpgrade?: () => void;
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
  deadheadMiles?: string;
  detentionAmount?: string;
  notes?: string;
  pickupZip?: string;
  deliveryZip?: string;
  pickupCityState?: string;
  deliveryCityState?: string;
  estimatedMiles?: number;

  // Multi-stop fields — intermediate stops only, empty array for single-stop loads.
  stops?: NewLoadStop[];
}

export interface DeleteConfirmation {
  type: 'load' | 'deduction';
  id: string;
}
