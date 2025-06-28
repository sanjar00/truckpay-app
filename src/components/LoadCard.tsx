
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface Load {
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

interface LoadCardProps {
  load: Load;
  onDelete: (id: string) => void;
}

const LoadCard = ({ load, onDelete }: LoadCardProps) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{load.locationFrom} → {load.locationTo}</span>
            </div>
            
            {/* Date Information */}
            <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Pickup: {formatDate(load.pickupDate)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Delivery: {formatDate(load.deliveryDate)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Load Rate</p>
                <p className="font-semibold text-green-600">${formatCurrency(load.rate)}</p>
              </div>
              <div>
                <p className="text-gray-600">Deduction</p>
                <p className="font-semibold text-red-600">{load.companyDeduction}%</p>
              </div>
              <div>
                <p className="text-gray-600">Driver Pay</p>
                <p className="font-semibold text-blue-600">${formatCurrency(load.driverPay)}</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(load.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoadCard;