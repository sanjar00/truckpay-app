import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, Percent, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import LocationCombobox from './LocationCombobox';
import { NewLoad } from '@/types/LoadReports';

const formSchema = z.object({
  rate: z.coerce.number().positive('Rate must be positive'),
  companyDeduction: z.coerce.number().min(0, 'Deduction must be positive').max(100, 'Deduction cannot exceed 100'),
  locationFrom: z.string().min(1, 'From state is required'),
  locationTo: z.string().min(1, 'To state is required'),
  pickupDate: z.date({ required_error: 'Pickup date is required' }),
  deliveryDate: z.date({ required_error: 'Delivery date is required' })
});

type FormValues = z.infer<typeof formSchema>;

interface AddLoadFormProps {
  onAddLoad: (data: NewLoad) => void;
  onCancel: () => void;
  loading: boolean;
  weekStart: Date;
  weekEnd: Date;
}

const AddLoadForm = ({ onAddLoad, onCancel, loading, weekStart, weekEnd }: AddLoadFormProps) => {
  const [pickupCalendarOpen, setPickupCalendarOpen] = useState(false);
  const [deliveryCalendarOpen, setDeliveryCalendarOpen] = useState(false);

  const { control, register, handleSubmit, watch, formState: { errors, isValid } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      locationFrom: '',
      locationTo: '',
      pickupDate: undefined,
      deliveryDate: undefined
    },
    mode: 'onChange'
  });

  const pickupDate = watch('pickupDate');

  const submitHandler = (data: FormValues) => {
    onAddLoad(data);
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Load</CardTitle>
          <p className="text-sm text-gray-600">
            Adding to week: {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location From */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              From State
            </Label>
            <Controller
              name="locationFrom"
              control={control}
              render={({ field }) => (
                <LocationCombobox
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select origin state..."
                />
              )}
            />
            {errors.locationFrom && (
              <p className="text-sm text-red-500">{errors.locationFrom.message}</p>
            )}
          </div>

          {/* Location To */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              To State
            </Label>
            <Controller
              name="locationTo"
              control={control}
              render={({ field }) => (
                <LocationCombobox
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select destination state..."
                />
              )}
            />
            {errors.locationTo && (
              <p className="text-sm text-red-500">{errors.locationTo.message}</p>
            )}
          </div>

          {/* Pickup Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Pickup Date
            </Label>
            <Controller
              name="pickupDate"
              control={control}
              render={({ field }) => (
                <Popover open={pickupCalendarOpen} onOpenChange={setPickupCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-12 justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : "Select pickup date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setPickupCalendarOpen(false);
                      }}
                      disabled={(date) => date < weekStart || date > weekEnd}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.pickupDate && (
              <p className="text-sm text-red-500">{errors.pickupDate.message}</p>
            )}
          </div>

          {/* Delivery Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Delivery Date
            </Label>
            <Controller
              name="deliveryDate"
              control={control}
              render={({ field }) => (
                <Popover open={deliveryCalendarOpen} onOpenChange={setDeliveryCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-12 justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : "Select delivery date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setDeliveryCalendarOpen(false);
                      }}
                      initialFocus
                      disabled={(date) => {
                        if (pickupDate && date < pickupDate) {
                          return true;
                        }
                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.deliveryDate && (
              <p className="text-sm text-red-500">{errors.deliveryDate.message}</p>
            )}
          </div>

          {/* Load Rate */}
          <div className="space-y-2">
            <Label htmlFor="loadRate" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Load Rate
            </Label>
            <Input
              id="loadRate"
              type="number"
              placeholder="1200.00"
              step="0.01"
              {...register('rate')}
              className="h-12"
            />
            {errors.rate && (
              <p className="text-sm text-red-500">{errors.rate.message}</p>
            )}
          </div>

          {/* Company Deduction */}
          <div className="space-y-2">
            <Label htmlFor="companyDeduction" className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Company Deduction (%)
            </Label>
            <Input
              id="companyDeduction"
              type="number"
              placeholder="25.00"
              step="0.01"
              min="0"
              max="100"
              {...register('companyDeduction')}
              className="h-12"
            />
            {errors.companyDeduction && (
              <p className="text-sm text-red-500">{errors.companyDeduction.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={loading || !isValid}
            >
              {loading ? 'Adding...' : 'Add Load'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default AddLoadForm;

