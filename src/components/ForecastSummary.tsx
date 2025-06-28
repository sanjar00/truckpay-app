import { ArrowLeft, TrendingUp, DollarSign, Minus, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';

const ForecastSummary = ({ grossPay, driverPay, totalDeductions, netIncome, onBack }) => {
  const netIncomePercentage = driverPay > 0 ? ((netIncome / driverPay) * 100) : 0;
  
  return (
    <div className="min-h-screen bg-background brutal-grid p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="brutal-border brutal-shadow mobile-h mobile-w brutal-hover"
          >
            <ArrowLeft className="mobile-icon" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="mobile-text-2xl brutal-text font-bold mobile-truncate mb-2">
              FORECAST SUMMARY
            </h1>
            <p className="mobile-text-sm text-muted-foreground mobile-truncate">
              Weekly income breakdown
            </p>
          </div>
        </div>

        {/* Net Income Highlight Card */}
        <Card className="brutal-border brutal-shadow-lg bg-success/10 mb-8">
          <CardContent className="p-6 text-center">
            <TrendingUp className="mobile-icon-lg mx-auto mb-4 text-success" />
            <p className="mobile-text-base text-muted-foreground mb-2 mobile-text-wrap">
              WEEKLY NET INCOME
            </p>
            <p className="mobile-text-3xl brutal-text font-bold text-success mb-4">
              ${formatCurrency(netIncome)}
            </p>
            <div className="flex items-center justify-center gap-2 mobile-text-sm text-muted-foreground">
              <Calculator className="mobile-icon" />
              <span className="mobile-text-wrap">
                {netIncomePercentage.toFixed(1)}% of driver pay retained
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Income Breakdown Section */}
        <Card className="brutal-border brutal-shadow bg-background mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="mobile-text-xl brutal-text font-bold">
              INCOME BREAKDOWN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Gross Pay */}
            <div className="brutal-border brutal-shadow p-4 bg-primary/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-4 h-4 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="mobile-text-base brutal-text font-medium mobile-truncate">
                    TOTAL GROSS PAY
                  </span>
                </div>
                <span className="mobile-text-xl brutal-text font-bold text-primary">
                  ${formatCurrency(grossPay)}
                </span>
              </div>
            </div>

            {/* Driver Pay */}
            <div className="brutal-border brutal-shadow p-4 bg-success/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-4 h-4 bg-success rounded-full flex-shrink-0"></div>
                  <span className="mobile-text-base brutal-text font-medium mobile-text-wrap">
                    DRIVER PAY (AFTER COMPANY CUT)
                  </span>
                </div>
                <span className="mobile-text-xl brutal-text font-bold text-success">
                  ${formatCurrency(driverPay)}
                </span>
              </div>
            </div>

            {/* Deductions */}
            <div className="brutal-border brutal-shadow p-4 bg-warning/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Minus className="mobile-icon text-warning flex-shrink-0" />
                  <span className="mobile-text-base brutal-text font-medium mobile-truncate">
                    TOTAL DEDUCTIONS
                  </span>
                </div>
                <span className="mobile-text-xl brutal-text font-bold text-warning">
                  -${formatCurrency(totalDeductions)}
                </span>
              </div>
            </div>

            {/* Net Income */}
            <div className="brutal-border brutal-shadow-lg p-4 bg-success/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <DollarSign className="mobile-icon text-success flex-shrink-0" />
                  <span className="mobile-text-lg brutal-text font-bold mobile-truncate">
                    NET INCOME
                  </span>
                </div>
                <span className="mobile-text-2xl brutal-text font-bold text-success">
                  ${formatCurrency(netIncome)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual Progress Section */}
        <Card className="brutal-border brutal-shadow bg-background mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="mobile-text-xl brutal-text font-bold">
              INCOME FLOW
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mobile-text-sm mb-3">
                <span className="mobile-text-wrap brutal-text font-medium">Driver Pay vs Deductions</span>
                <span className="brutal-text font-bold">{netIncomePercentage.toFixed(1)}% retained</span>
              </div>
              <Progress value={netIncomePercentage} className="h-4 brutal-border brutal-shadow" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center mobile-text-sm">
              <div className="brutal-border brutal-shadow p-4 bg-success/5">
                <p className="text-muted-foreground mobile-text-wrap brutal-text font-medium mb-2">TAKE HOME</p>
                <p className="brutal-text font-bold text-success mobile-text-lg">
                  ${formatCurrency(netIncome)}
                </p>
              </div>
              <div className="brutal-border brutal-shadow p-4 bg-warning/5">
                <p className="text-muted-foreground mobile-text-wrap brutal-text font-medium mb-2">DEDUCTED</p>
                <p className="brutal-text font-bold text-warning mobile-text-lg">
                  ${formatCurrency(totalDeductions)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculation Formula Section */}
        <Card className="brutal-border brutal-shadow bg-muted/20 mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="mobile-text-xl brutal-text font-bold">
              CALCULATION BREAKDOWN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 mobile-text-sm">
            <div className="flex justify-between p-3 brutal-border bg-background">
              <span className="brutal-text font-medium">Gross Pay:</span>
              <span className="brutal-text font-bold">${formatCurrency(grossPay)}</span>
            </div>
            <div className="flex justify-between p-3 brutal-border bg-success/5">
              <span className="brutal-text font-medium text-success">Driver Pay:</span>
              <span className="brutal-text font-bold text-success">${formatCurrency(driverPay)}</span>
            </div>
            <div className="flex justify-between p-3 brutal-border bg-warning/5">
              <span className="brutal-text font-medium text-warning">- Deductions:</span>
              <span className="brutal-text font-bold text-warning">-${formatCurrency(totalDeductions)}</span>
            </div>
            <hr className="my-4 border-border" />
            <div className="flex justify-between p-4 brutal-border brutal-shadow bg-success/10">
              <span className="brutal-text font-bold mobile-text-base">NET INCOME:</span>
              <span className={`brutal-text font-bold mobile-text-base ${
                netIncome >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                ${formatCurrency(netIncome)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights Section */}
        <Card className="brutal-border brutal-shadow bg-info/10">
          <CardHeader className="pb-4">
            <CardTitle className="brutal-text font-bold text-info mobile-text-xl">
              WEEKLY INSIGHTS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 mobile-text-sm text-info">
            {netIncomePercentage >= 70 && (
              <div className="brutal-border brutal-shadow p-4 bg-success/10">
                <p className="mobile-text-wrap brutal-text font-medium">
                  ✅ EXCELLENT! You're retaining {netIncomePercentage.toFixed(1)}% of your driver pay.
                </p>
              </div>
            )}
            {netIncomePercentage >= 50 && netIncomePercentage < 70 && (
              <div className="brutal-border brutal-shadow p-4 bg-warning/10">
                <p className="mobile-text-wrap brutal-text font-medium">
                  💪 GOOD retention rate at {netIncomePercentage.toFixed(1)}%. Consider optimizing deductions.
                </p>
              </div>
            )}
            {netIncomePercentage < 50 && netIncomePercentage >= 0 && (
              <div className="brutal-border brutal-shadow p-4 bg-warning/20">
                <p className="mobile-text-wrap brutal-text font-medium">
                  ⚠️ LOW retention at {netIncomePercentage.toFixed(1)}%. Review your deductions for savings opportunities.
                </p>
              </div>
            )}
            {netIncome < 0 && (
              <div className="brutal-border brutal-shadow p-4 bg-destructive/10">
                <p className="mobile-text-wrap brutal-text font-medium text-destructive">
                  🚨 NEGATIVE net income. Your deductions exceed your driver pay.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForecastSummary;