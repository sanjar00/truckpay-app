
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

interface WeekNavigationProps {
  weekStart: Date;
  weekEnd: Date;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
}

const WeekNavigation = ({ weekStart, weekEnd, onNavigateWeek }: WeekNavigationProps) => {
  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onNavigateWeek('prev')}
            className="bg-white"
          >
            ← Previous Week
          </Button>
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-900">Current Week</span>
            </div>
            <p className="text-sm text-blue-700">
              {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
            </p>
            <p className="text-xs text-blue-600">(Sunday to Saturday)</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onNavigateWeek('next')}
            className="bg-white"
          >
            Next Week →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeekNavigation;