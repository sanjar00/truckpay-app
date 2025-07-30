import { ArrowLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { getWeeklyPeriodDisplay } from '@/lib/loadReportsUtils';

interface LoadReportsHeaderProps {
  onBack: () => void;
  weekStart: Date;
  weekEnd: Date;
  userProfile: any;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
}

const LoadReportsHeader = ({ 
  onBack, 
  weekStart, 
  weekEnd, 
  userProfile, 
  onNavigateWeek 
}: LoadReportsHeaderProps) => {
  return (
    <>
      {/* Header */}
      <div className="brutal-border bg-card p-6 brutal-shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="brutal-border brutal-shadow mobile-h mobile-w brutal-hover"
          >
            <ArrowLeft className="mobile-icon" />
          </Button>
          <div>
            <h1 className="brutal-text text-3xl text-foreground">LOAD REPORTS</h1>
            <p className="brutal-mono text-sm text-muted-foreground">WEEK_MANAGEMENT_SYSTEM</p>
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="brutal-border-info bg-info p-4 sm:p-6 brutal-shadow">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onNavigateWeek('prev')}
            className="brutal-border bg-background text-foreground w-full sm:w-auto"
          >
            ← PREV_WEEK
          </Button>
          <div className="text-center flex-1">
            <div className="flex items-center gap-2 justify-center mb-2">
              <Calendar className="w-6 h-6 text-info-foreground" />
              <span className="brutal-text text-lg sm:text-xl text-info-foreground">CURRENT_WEEK</span>
            </div>
            <p className="brutal-mono text-sm text-info-foreground">
              {format(weekStart, 'MMM_dd')} - {format(weekEnd, 'MMM_dd,_yyyy')}
            </p>
            <p className="brutal-mono text-xs text-info-foreground opacity-80">
              ({getWeeklyPeriodDisplay(userProfile?.weeklyPeriod || 'sunday')})
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onNavigateWeek('next')}
            className="brutal-border bg-background text-foreground w-full sm:w-auto"
          >
            NEXT_WEEK →
          </Button>
        </div>
      </div>
    </>
  );
};

export default LoadReportsHeader;