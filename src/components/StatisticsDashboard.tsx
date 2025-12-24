// Statistics Dashboard with customizable widgets

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, FileText, CreditCard, BarChart3, RefreshCw } from 'lucide-react';
import { getBills, getPayments, getCustomers, getAllCustomerBalances, getBusinessGoals, saveBusinessGoals, type BusinessGoals } from '@/lib/storage';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

interface StatWidget {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const StatisticsDashboard = ({ onNavigate }: DashboardProps) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [goals, setGoals] = useState<BusinessGoals>(() => getBusinessGoals());
  const [goalInputs, setGoalInputs] = useState({
    monthlyRevenueTarget: goals.monthlyRevenueTarget ? goals.monthlyRevenueTarget.toString() : '',
    collectionEfficiencyTarget: goals.collectionEfficiencyTarget ? goals.collectionEfficiencyTarget.toString() : '90',
  });

  const stats = useMemo(() => {
    setIsLoading(true);
    const bills = getBills();
    const payments = getPayments();
    const customers = getCustomers();
    const balances = getAllCustomerBalances();

    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      default:
        startDate = new Date(0);
    }

    const filteredBills = bills.filter(b => new Date(b.date) >= startDate);
    const filteredPayments = payments.filter(p => new Date(p.date) >= startDate);

    // Calculate metrics
    const totalRevenue = filteredBills.reduce((sum, b) => sum + b.grandTotal, 0);
    const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = totalRevenue - totalPaid;
    const billCount = filteredBills.length;
    const paymentCount = filteredPayments.length;
    const customerCount = customers.length;
    const activeCustomers = new Set(filteredBills.map(b => b.customerId)).size;

    // Previous period comparison
    const previousStart = new Date(startDate);
    const previousEnd = startDate;
    const daysDiff = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    previousStart.setTime(previousStart.getTime() - daysDiff * 1000 * 60 * 60 * 24);

    const previousBills = bills.filter(b => {
      const billDate = new Date(b.date);
      return billDate >= previousStart && billDate < previousEnd;
    });
    const previousRevenue = previousBills.reduce((sum, b) => sum + b.grandTotal, 0);
    const revenueChange = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    const customersWithPending = balances.filter(b => b.pending > 0).length;
    const avgBillAmount = billCount > 0 ? totalRevenue / billCount : 0;
    const avgPaymentAmount = paymentCount > 0 ? totalPaid / paymentCount : 0;

    // Customer lifetime values
    const customerLifetimeValues = customers.map(customer => {
      const customerBills = filteredBills.filter(b => b.customerId === customer.id);
      const customerPayments = filteredPayments.filter(p => p.customerId === customer.id);
      const totalRevenue = customerBills.reduce((sum, b) => sum + b.grandTotal, 0);
      const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
      return {
        name: customer.name.length > 15 ? customer.name.substring(0, 15) + '...' : customer.name,
        fullName: customer.name,
        totalRevenue,
        totalPaid,
        pending: totalRevenue - totalPaid,
        billCount: customerBills.length
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);

    // Monthly revenue trends
    const monthlyRevenue = filteredBills.reduce((acc: { [key: string]: number }, bill) => {
      const month = format(new Date(bill.date), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + bill.grandTotal;
      return acc;
    }, {});
    const monthlyData = Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-12);

    // Payment collection efficiency
    const collectionEfficiency = totalRevenue > 0 
      ? parseFloat(((totalPaid / totalRevenue) * 100).toFixed(1))
      : 0;

    setIsLoading(false);
    setLastUpdated(new Date());

    return {
      totalRevenue,
      totalPaid,
      outstanding,
      billCount,
      paymentCount,
      customerCount,
      activeCustomers,
      customersWithPending,
      avgBillAmount,
      avgPaymentAmount,
      revenueChange,
      customerLifetimeValues,
      monthlyData,
      collectionEfficiency
    };
  }, [timeRange]);

  const currentMonthRevenue = stats.monthlyData.length
    ? stats.monthlyData[stats.monthlyData.length - 1]?.revenue ?? 0
    : stats.totalRevenue;

  const revenueGoalProgress =
    goals.monthlyRevenueTarget > 0
      ? Math.min(100, Math.round((currentMonthRevenue / goals.monthlyRevenueTarget) * 100))
      : 0;

  const collectionGoalProgress =
    goals.collectionEfficiencyTarget > 0
      ? Math.min(100, Math.round((stats.collectionEfficiency / goals.collectionEfficiencyTarget) * 100))
      : 0;

  const handleGoalsSave = () => {
    const monthlyRevenueTarget = parseFloat(goalInputs.monthlyRevenueTarget || '0');
    const collectionEfficiencyTarget = parseFloat(goalInputs.collectionEfficiencyTarget || '0');
    const updated = saveBusinessGoals({
      monthlyRevenueTarget: isNaN(monthlyRevenueTarget) ? 0 : monthlyRevenueTarget,
      collectionEfficiencyTarget: isNaN(collectionEfficiencyTarget) ? 0 : collectionEfficiencyTarget,
    });
    setGoals(updated);
  };

  const widgets: StatWidget[] = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      change: stats.revenueChange,
      changeLabel: 'vs previous period',
      icon: DollarSign,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      id: 'outstanding',
      title: 'Outstanding',
      value: `₹${stats.outstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      icon: CreditCard,
      color: 'text-red-600 dark:text-red-400'
    },
    {
      id: 'bills',
      title: 'Bills',
      value: stats.billCount,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'customers',
      title: 'Active Customers',
      value: `${stats.activeCustomers}/${stats.customerCount}`,
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      id: 'pending',
      title: 'Customers with Pending',
      value: stats.customersWithPending,
      icon: TrendingUp,
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      id: 'avg-bill',
      title: 'Avg Bill Amount',
      value: `₹${stats.avgBillAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      icon: BarChart3,
      color: 'text-indigo-600 dark:text-indigo-400'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onNavigate('dashboard')}
              className="h-10 w-10 p-0 sm:h-auto sm:w-auto sm:px-3"
            >
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Statistics Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Last updated: {format(lastUpdated, 'HH:mm:ss')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="flex-1 sm:flex-none min-w-[70px]"
              >
                {range === 'all' ? 'All' : range.toUpperCase()}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeRange(timeRange)}
              disabled={isLoading}
              className="w-10 sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Stats Grid - Mobile Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
          {widgets.map((widget) => {
            const Icon = widget.icon;
            return (
              <Card key={widget.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">{widget.title}</CardTitle>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${widget.color}`} />
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-lg sm:text-2xl font-bold">{widget.value}</div>
                  {widget.change !== undefined && (
                    <p className={`text-xs mt-1 ${widget.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {widget.change >= 0 ? <TrendingUp className="inline w-3 h-3" /> : <TrendingDown className="inline w-3 h-3" />}
                      {' '}
                      {Math.abs(widget.change).toFixed(1)}% {widget.changeLabel}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Advanced Analytics Tabs */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="insights" className="hidden lg:block">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
                <CardDescription>Revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue (₹)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Customers by Lifetime Value</CardTitle>
                <CardDescription>Customers ranked by total revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={stats.customerLifetimeValues}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalRevenue" fill="#8884d8" name="Total Revenue (₹)" />
                    <Bar dataKey="totalPaid" fill="#82ca9d" name="Total Paid (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Collection Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{stats.collectionEfficiency}%</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {stats.totalPaid.toLocaleString('en-IN')} paid of {stats.totalRevenue.toLocaleString('en-IN')} billed
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Average Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Bill Amount</p>
                    <p className="text-2xl font-bold">₹{stats.avgBillAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Payment Amount</p>
                    <p className="text-2xl font-bold">₹{stats.avgPaymentAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Insights</CardTitle>
                <CardDescription>Key metrics at a glance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Payment Rate</p>
                    <p className="text-2xl font-bold">
                      {stats.totalRevenue > 0 
                        ? ((stats.totalPaid / stats.totalRevenue) * 100).toFixed(1)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalPaid.toLocaleString('en-IN')} paid of {stats.totalRevenue.toLocaleString('en-IN')} billed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Customers with Pending</p>
                    <p className="text-2xl font-bold">{stats.customersWithPending}</p>
                    <p className="text-xs text-muted-foreground">
                      Out of {stats.customerCount} total customers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Goals & Progress</CardTitle>
                <CardDescription>Track your targets and see how close you are</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Monthly Revenue Target (₹)</p>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={goalInputs.monthlyRevenueTarget}
                      onChange={(e) =>
                        setGoalInputs((prev) => ({ ...prev, monthlyRevenueTarget: e.target.value }))
                      }
                      placeholder="Enter target revenue"
                    />
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          Current month: ₹{currentMonthRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span>{revenueGoalProgress}%</span>
                      </div>
                      <Progress value={revenueGoalProgress} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Collection Efficiency Target (%)</p>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={goalInputs.collectionEfficiencyTarget}
                      onChange={(e) =>
                        setGoalInputs((prev) => ({ ...prev, collectionEfficiencyTarget: e.target.value }))
                      }
                      placeholder="e.g. 95"
                    />
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Current: {stats.collectionEfficiency}%</span>
                        <span>{collectionGoalProgress}%</span>
                      </div>
                      <Progress value={collectionGoalProgress} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleGoalsSave}>
                    Save Goals
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

