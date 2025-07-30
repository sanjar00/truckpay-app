import { Navigation } from 'lucide-react';
import { WeeklyMileage } from '@/types/LoadReports';

interface MileageTrackingProps {
  weeklyMileage: WeeklyMileage;
  onMileageChange: (field: 'startMileage' | 'endMileage', value: string) => void;
  calculateRPM: () => number;
}

const MileageTracking = ({ weeklyMileage, onMileageChange, calculateRPM }: MileageTrackingProps) => {
  return (
    <div className="brutal-border-accent bg-accent/10 p-6 brutal-shadow">
      <div className="flex items-center gap-3 mb-4">
        <Navigation className="w-6 h-6 text-accent-foreground" />
        <h3 className="brutal-text text-xl text-accent-foreground">WEEKLY_MILEAGE</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="brutal-mono text-sm text-accent-foreground mb-2 block">
            START_OF_WEEK_MILEAGE
          </label>
          <input
            type="number"
            placeholder="0"
            value={weeklyMileage.startMileage}
            onChange={(e) => onMileageChange('startMileage', e.target.value)}
            className="w-full p-3 brutal-border bg-background text-foreground brutal-mono"
          />
        </div>
        
        <div>
          <label className="brutal-mono text-sm text-accent-foreground mb-2 block">
            END_OF_WEEK_MILEAGE
          </label>
          <input
            type="number"
            placeholder="0"
            value={weeklyMileage.endMileage}
            onChange={(e) => onMileageChange('endMileage', e.target.value)}
            className="w-full p-3 brutal-border bg-background text-foreground brutal-mono"
          />
        </div>
      </div>
      
      {/* Only show Miles Driven and RPM when both start and end mileage are entered */}
      {weeklyMileage.startMileage && weeklyMileage.endMileage && weeklyMileage.totalMiles > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Miles Driven Display */}
          <div className="brutal-border-success bg-success p-4 brutal-shadow text-center">
            <p className="brutal-mono text-sm text-success-foreground mb-1">MILES_DRIVEN_THIS_WEEK</p>
            <p className="brutal-text text-2xl text-success-foreground">{weeklyMileage.totalMiles.toLocaleString()}</p>
            <p className="brutal-mono text-xs text-success-foreground opacity-80">TOTAL_MILES</p>
          </div>
          
          {/* Rate Per Mile Display */}
          <div className="brutal-border-warning bg-warning p-4 brutal-shadow text-center">
            <p className="brutal-mono text-sm text-warning-foreground mb-1">RATE_PER_MILE_(RPM)</p>
            <p className="brutal-text text-2xl text-warning-foreground">${calculateRPM().toFixed(2)}</p>
            <p className="brutal-mono text-xs text-warning-foreground opacity-80">PER_MILE</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MileageTracking;