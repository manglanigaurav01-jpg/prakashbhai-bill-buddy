import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Download, CalendarIcon } from "lucide-react";
import { getCustomers, getBills, getPayments } from "@/lib/storage";
import { generateCustomerSummaryPDF } from "@/lib/pdf";
import { Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { generateMonthlyBalances, getMonthLabel } from "@/lib/monthly-balance";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LastBalanceProps {
  onNavigate: (view: string) => void;
}

interface MonthlyBalance {
  opening: number;
  closing: number;
  transactions: {
    bills: number;
    payments: number;
  };
}

interface CustomerBalances {
  [key: string]: {
    [monthKey: string]: MonthlyBalance;
  };
}

interface CustomerBalanceSummary {
  customerId: string;
  customerName: string;
  totalSales: number;
  totalPaid: number;
  pending: number;
}

export const LastBalance = ({ onNavigate }: LastBalanceProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [monthlyBalances, setMonthlyBalances] = useState<CustomerBalances>({});
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [customerBalance, setCustomerBalance] = useState<CustomerBalanceSummary | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = () => {
      const customerList = getCustomers();
      const bills = getBills();
      const payments = getPayments();
      
      setCustomers(customerList);
      
      // Calculate running balances up to current date
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const balances = customerList.reduce((acc: any, customer) => {
        const customerBills = bills.filter(b => b.customerId === customer.id);
        const customerPayments = payments.filter(p => p.customerId === customer.id);
        
        // Get last month's balance
        const lastMonthKey = currentMonth === 0 
          ? `${currentYear - 1}-12`
          : `${currentYear}-${currentMonth}`;
          
        let openingBalance = 0;
        
        // Calculate all transactions for this customer
        const monthlyTotals = customerBills.reduce((totals: any, bill) => {
          const billDate = new Date(bill.date);
          const key = `${billDate.getFullYear()}-${billDate.getMonth() + 1}`;
          if (!totals[key]) totals[key] = { bills: 0, payments: 0 };
          totals[key].bills += bill.grandTotal;
          return totals;
        }, {});

        customerPayments.forEach(payment => {
          const paymentDate = new Date(payment.date);
          const key = `${paymentDate.getFullYear()}-${paymentDate.getMonth() + 1}`;
          if (!monthlyTotals[key]) monthlyTotals[key] = { bills: 0, payments: 0 };
          monthlyTotals[key].payments += payment.amount;
        });

        // Calculate running balance
        Object.keys(monthlyTotals).forEach(month => {
          const total = monthlyTotals[month];
          openingBalance = openingBalance + total.bills - total.payments;
          
          acc[customer.id] = {
            ...acc[customer.id],
            [month]: {
              opening: month === lastMonthKey ? openingBalance : 0,
              transactions: total,
              closing: openingBalance
            }
          };
        });

        return acc;
      }, {});

      setMonthlyBalances(balances);
    };

    loadData();
    
    // Set up auto-refresh every day at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeToMidnight = tomorrow.getTime() - now.getTime();
    
    const timer = setTimeout(loadData, timeToMidnight);
    return () => clearTimeout(timer);
  }, []);

  // Update customer balance when customer is selected or date range changes
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerBalance(undefined);
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    const bills = getBills();
    const payments = getPayments();

    const customerBills = bills.filter(b => b.customerId === selectedCustomer)
      .filter(b => {
        const billDate = new Date(b.date);
        return (!startDate || billDate >= startDate) && (!endDate || billDate <= endDate);
      });

    const customerPayments = payments.filter(p => p.customerId === selectedCustomer)
      .filter(p => {
        const paymentDate = new Date(p.date);
        return (!startDate || paymentDate >= startDate) && (!endDate || paymentDate <= endDate);
      });

    const totalSales = customerBills.reduce((sum, bill) => sum + bill.grandTotal, 0);
    const totalPaid = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const pending = totalSales - totalPaid;

    setCustomerBalance({
      customerId: selectedCustomer,
      customerName: customer.name,
      totalSales,
      totalPaid,
      pending
    });
  }, [selectedCustomer, customers, startDate, endDate]);

  const handleGenerateSummaryPDF = async (customerId: string) => {
    try {
      const result = await generateCustomerSummaryPDF(customerId);
      if (result.success) {
        toast({
          title: "Summary Generated",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate summary PDF",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Last Balance</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Date Range and Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Last Balance Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : <span>Pick start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : <span>Pick end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Customer</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer to view balance" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Customer Balance Summary */}
          {customerBalance && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Balance Summary - {customerBalance.customerName}</span>
                  <Button 
                    onClick={() => handleGenerateSummaryPDF(customerBalance.customerId)}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Sales</div>
                    <div className="font-bold text-primary">₹{customerBalance.totalSales.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-accent/5 rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Paid</div>
                    <div className="font-bold text-accent">₹{customerBalance.totalPaid.toFixed(2)}</div>
                  </div>
                  <div className={`p-3 rounded-lg ${customerBalance.pending > 0 ? 'bg-destructive/5' : customerBalance.pending < 0 ? 'bg-accent/5' : 'bg-accent/5'}`}>
                    <div className="text-sm text-muted-foreground">
                      {customerBalance.pending > 0 ? 'Pending' : customerBalance.pending < 0 ? 'Advance' : 'Status'}
                    </div>
                    <div className={`font-bold ${customerBalance.pending > 0 ? 'text-destructive' : 'text-accent'}`}>
                      {customerBalance.pending > 0 ? `₹${customerBalance.pending.toFixed(2)}` : 
                       customerBalance.pending < 0 ? `₹${Math.abs(customerBalance.pending).toFixed(2)}` : 'Cleared'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};