// Statistics Dashboard with customizable widgets

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, FileText, CreditCard, Calendar, BarChart3, PieChart, RefreshCw } from 'lucide-react';
import { getBills, getPayments, getCustomers, getAllCustomerBalances } from '@/lib/storage';
import { format, subDays, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';

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
      revenueChange
    };
  }, [timeRange]);

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Statistics Dashboard</h1>
              <p className="text-muted-foreground">
                Last updated: {format(lastUpdated, 'HH:mm:ss')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('90d')}
            >
              90 Days
            </Button>
            <Button
              variant={timeRange === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('all')}
            >
              All Time
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeRange(timeRange)}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets.map((widget) => {
            const Icon = widget.icon;
            return (
              <Card key={widget.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${widget.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{widget.value}</div>
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
                <p className="text-sm font-medium">Average Payment</p>
                <p className="text-2xl font-bold">
                  ₹{stats.avgPaymentAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on {stats.paymentCount} payments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

