import { z } from 'zod';

export const loadSchema = z.object({
  rate: z
    .string()
    .min(1, 'Rate is required')
    .refine((val) => parseFloat(val) > 0, {
      message: 'Rate must be greater than 0',
    }),
  companyDeduction: z
    .string()
    .min(1, 'Company deduction is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    }, {
      message: 'Company deduction must be between 0 and 100',
    }),
  locationFrom: z.string().min(1, 'Origin state is required'),
  locationTo: z.string().min(1, 'Destination state is required'),
  pickupDate: z.date({ required_error: 'Pickup date is required' }),
  deliveryDate: z
    .date({ required_error: 'Delivery date is required' })
    .refine((date, ctx) => {
      const pickup = ctx.parent.pickupDate;
      return !pickup || date >= pickup;
    }, {
      message: 'Delivery date cannot be before pickup date',
    }),
});

export type LoadFormData = z.infer<typeof loadSchema>;

export const deductionSchema = z.object({
  type: z.string().min(1, 'Deduction type is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, {
      message: 'Amount must be a positive number',
    }),
});

export type DeductionFormData = z.infer<typeof deductionSchema>;

