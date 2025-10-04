import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBills, getPayments, getAllCustomerBalances } from '@/lib/storage';
import {
  calculateCustomerLifetimeValue,
  calculatePaymentCollectionEfficiency,
  calculateItemProfitability,
  generateComparisonReport,
} from '@/lib/analytics-advanced';

interface AdvancedReportsProps {
  onNavigate: (view: string) => void;
}

export const AdvancedReports = ({ onNavigate }: AdvancedReportsProps) => {
  const [loading, setLoading] = useState(true);
  const [clvData, setClvData] = useState<any[]>([]);
  const [efficiencyData, setEfficiencyData] = useState<any>(null);
  const [profitabilityData, setProfitabilityData] = useState<any[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<any>(null);
  const [yearlyComparison, setYearlyComparison] = useState<any>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    
    const bills = getBills();
    const payments = getPayments();
    const customers = getAllCustomerBalances();

    const clv = calculateCustomerLifetimeValue(bills, payments, customers);
    const efficiency = calculatePaymentCollectionEfficiency(bills, payments);
    const profitability = calculateItemProfitability(bills);
    const monthly = generateComparisonReport(bills, payments, 'month');
    const yearly = generateComparisonReport(bills, payments, 'year');

    setClvData(clv);
    setEfficiencyData(efficiency);
    setProfitabilityData(profitability);
    setMonthlyComparison(monthly);
    setYearlyComparison(yearly);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center py-8">Loading advanced reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Advanced Reports</h1>
            <p className="text-muted-foreground">Detailed business intelligence</p>
          </div>
        </div>

        <Tabs defaultValue="clv" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clv">Customer Value</TabsTrigger>
            <TabsTrigger value="efficiency">Collection</TabsTrigger>
            <TabsTrigger value="profitability">Profitability</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="clv" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Customer Lifetime Value
                </CardTitle>
                <CardDescription>Total value and engagement metrics per customer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clvData.slice(0, 10).map((customer, idx) => (
                    <div key={customer.customerId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-muted-foreground">#{idx + 1}</span>
                          <div>
                            <div className="font-medium">{customer.customerName}</div>
                            <div className="text-sm text-muted-foreground">
                              {customer.totalBills} bills • {customer.lifetime} days • {customer.paymentRate.toFixed(1)}% payment rate
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">₹{customer.totalRevenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Avg: ₹{customer.averageBillValue.toFixed(0)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="efficiency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Collection Efficiency
                </CardTitle>
                <CardDescription>How efficiently you collect payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Collection Rate</div>
                    <div className="text-2xl font-bold">{efficiencyData.collectionRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      ₹{efficiencyData.totalCollected.toLocaleString()} of ₹{efficiencyData.totalBilled.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Avg Collection Time</div>
                    <div className="text-2xl font-bold">{efficiencyData.averageCollectionTime.toFixed(0)} days</div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Outstanding Amount</div>
                    <div className="text-2xl font-bold text-red-600">₹{efficiencyData.outstandingAmount.toLocaleString()}</div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">On-Time Payments</div>
                    <div className="text-2xl font-bold text-green-600">{efficiencyData.onTimePayments}</div>
                    <div className="text-xs text-muted-foreground mt-1">Within 7 days</div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Late Payments</div>
                    <div className="text-2xl font-bold text-orange-600">{efficiencyData.latePayments}</div>
                    <div className="text-xs text-muted-foreground mt-1">After 7 days</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profitability" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Item Profitability Analysis
                </CardTitle>
                <CardDescription>Revenue contribution by product</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profitabilityData.slice(0, 15).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.itemName}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.totalQuantity} units • {item.numberOfBills} bills • Avg: ₹{item.averagePrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">₹{item.totalRevenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{item.revenueContribution.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Comparison</CardTitle>
                  <CardDescription>{monthlyComparison.period}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm text-muted-foreground">This Month</div>
                      <div className="text-xl font-bold">₹{monthlyComparison.currentRevenue.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{monthlyComparison.currentBills} bills</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Last Month</div>
                      <div className="text-xl font-bold">₹{monthlyComparison.previousRevenue.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{monthlyComparison.previousBills} bills</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-accent rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Growth</div>
                    <div className={`text-2xl font-bold ${monthlyComparison.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {monthlyComparison.growth >= 0 ? '+' : ''}₹{monthlyComparison.growth.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium">
                      {monthlyComparison.growthPercentage >= 0 ? '+' : ''}{monthlyComparison.growthPercentage.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 border rounded">
                      <div className="text-muted-foreground">Payments This Month</div>
                      <div className="font-medium">{monthlyComparison.currentPayments}</div>
                    </div>
                    <div className="p-2 border rounded">
                      <div className="text-muted-foreground">Payments Last Month</div>
                      <div className="font-medium">{monthlyComparison.previousPayments}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Yearly Comparison</CardTitle>
                  <CardDescription>{yearlyComparison.period}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm text-muted-foreground">This Year</div>
                      <div className="text-xl font-bold">₹{yearlyComparison.currentRevenue.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{yearlyComparison.currentBills} bills</div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Last Year</div>
                      <div className="text-xl font-bold">₹{yearlyComparison.previousRevenue.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{yearlyComparison.previousBills} bills</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-accent rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Growth</div>
                    <div className={`text-2xl font-bold ${yearlyComparison.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {yearlyComparison.growth >= 0 ? '+' : ''}₹{yearlyComparison.growth.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium">
                      {yearlyComparison.growthPercentage >= 0 ? '+' : ''}{yearlyComparison.growthPercentage.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 border rounded">
                      <div className="text-muted-foreground">Payments This Year</div>
                      <div className="font-medium">{yearlyComparison.currentPayments}</div>
                    </div>
                    <div className="p-2 border rounded">
                      <div className="text-muted-foreground">Payments Last Year</div>
                      <div className="font-medium">{yearlyComparison.previousPayments}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
