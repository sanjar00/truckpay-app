export type DateAttributionMethod = 
  | 'pickup_date'     // Attribute to pickup month
  | 'delivery_date'   // Attribute to delivery month  
  | 'split_evenly'    // Split revenue across months
  | 'primary_month';  // Attribute to month with most days

export interface LoadDateRange {
  pickupDate: Date;
  deliveryDate: Date;
  attributionMethod: DateAttributionMethod;
}