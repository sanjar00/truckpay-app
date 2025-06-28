
import { Truck, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface SummaryCardsProps {
  totalLoads: number;
  totalDriverPay: number;
}

const SummaryCards = ({ totalLoads, totalDriverPay }: SummaryCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-4 text-center">
          <Truck className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Total Loads</p>
          <p className="text-xl font-bold text-blue-600">{totalLoads}</p>
          <p className="text-xs text-gray-500">This Week</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Driver Pay</p>
          <p className="text-xl font-bold text-green-600">${formatCurrency(totalDriverPay)}</p>
          <p className="text-xs text-gray-500">This Week</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryCards;