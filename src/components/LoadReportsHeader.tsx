import { ArrowLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LocationCombobox from './LocationCombobox';
import { format } from 'date-fns';
import { getWeeklyPeriodDisplay } from '@/lib/loadReportsUtils';

interface LoadReportsHeaderProps {
  onBack: () => void;
  weekStart: Date;
  weekEnd: Date;
  userProfile: any;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  filters: {
    fromDate: string;
    toDate: string;
    locationFrom: string;
    locationTo: string;
  };
  onFilterChange: (filters: {
    fromDate: string;
    toDate: string;
    locationFrom: string;
    locationTo: string;
  }) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

const LoadReportsHeader = ({ 
  onBack, 
  weekStart, 
  weekEnd, 
  userProfile,
  onNavigateWeek,
  filters,
  onFilterChange,
  onApplyFilters,
  onResetFilters
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

      {/* Filters */}
      <div className="brutal-border bg-card p-4 brutal-shadow mt-4">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <Input
            type="date"
            value={filters.fromDate}
            onChange={e => onFilterChange({ ...filters, fromDate: e.target.value })}
            placeholder="FROM_DATE"
            className="brutal-border"
          />
          <Input
            type="date"
            value={filters.toDate}
            onChange={e => onFilterChange({ ...filters, toDate: e.target.value })}
            placeholder="TO_DATE"
            className="brutal-border"
          />
          <LocationCombobox
            value={filters.locationFrom}
            onValueChange={value => onFilterChange({ ...filters, locationFrom: value })}
            placeholder="FROM_STATE"
          />
          <LocationCombobox
            value={filters.locationTo}
            onValueChange={value => onFilterChange({ ...filters, locationTo: value })}
            placeholder="TO_STATE"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button onClick={onApplyFilters} className="brutal-border w-full sm:w-auto">
            APPLY_FILTERS
          </Button>
          <Button
            variant="outline"
            onClick={onResetFilters}
            className="brutal-border w-full sm:w-auto"
          >
            RESET
          </Button>
        </div>
      </div>
    </>
  );
};

export default LoadReportsHeader;