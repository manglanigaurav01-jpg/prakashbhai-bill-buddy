import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Download, CalendarIcon } from "lucide-react";
import { getCustomers, getBills, getPayments } from "@/lib/storage";
import { generateCustomerSummaryPDF } from "@/lib/pdf";
import { generateLastBalancePDF } from "@/lib/last-balance-pdf";
import { Customer, MonthlyBalance } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { generateMonthlyBalances } from "@/lib/monthly-balance";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LastBalanceProps {
  onNavigate: (view: string) => void;
}

interface CustomerSummary {
  customerId: string;
  customerName: string;
  totalBills: number;
  totalPayments: number;
  currentBalance: number;
  lastMonthBalance?: number;
}

export const LastBalance = ({ onNavigate }: LastBalanceProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyBalance[]>([]);
  const [customerSummary, setCustomerSummary] = useState<CustomerSummary | undefined>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const { toast } = useToast();

  // Load customers once
  useEffect(() => {
    const loadCustomers = () => {
      const customerList = getCustomers();
      setCustomers(customerList);
    };
    loadCustomers();
  }, []);

  // Update customer balance when customer is selected
  useEffect(() => {
    const loadBalances = async () => {
      if (!selectedCustomer) {
        setCustomerSummary(undefined);
        return;
      }

      try {
        const balances = await generateMonthlyBalances(selectedCustomer);
        setMonthlyBalances(balances);

        const customer = customers.find(c => c.id === selectedCustomer);
        const lastMonth = balances[balances.length - 2]; // Second to last entry is last month
        const currentMonth = balances[balances.length - 1]; // Last entry is current month

        if (customer && currentMonth) {
          setCustomerSummary({
            customerId: selectedCustomer,
            customerName: customer.name,
            totalBills: currentMonth.bills,
            totalPayments: currentMonth.payments,
            currentBalance: currentMonth.closingBalance,
            lastMonthBalance: lastMonth?.closingBalance
          });
        }
      } catch (error) {
        console.error('Error loading balance details:', error);
        toast({
          title: "Error",
          description: "Failed to load balance details",
          variant: "destructive",
        });
      }
    };

    loadBalances();
  }, [selectedCustomer, customers, toast]);

  const handleGenerateLastBalancePDF = async () => {
    if (!selectedCustomer || !customerSummary) {
      toast({
        title: "Error",
        description: "Please select a customer first",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Processing",
        description: "Generating PDF, please wait...",
      });

      const result = await generateLastBalancePDF(selectedCustomer, customerSummary.customerName);
      
      if (result.success) {
        toast({ 
          title: "Success", 
          description: result.message || "PDF generated successfully" 
        });
      } else {
        toast({ 
          title: "Error", 
          description: result.message || "Failed to generate PDF", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      console.error('PDF generation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate Last Balance PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Last Balance</h1>
            <p className="text-muted-foreground">View and generate last balance statements</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
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
            </div>
          </CardContent>
        </Card>

        {customerSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Balance Summary - {customerSummary.customerName}</span>
                <Button 
                  onClick={handleGenerateLastBalancePDF}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Generate PDF
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-primary/5 rounded-lg">
                  <div className="text-sm text-muted-foreground">Last Balance</div>
                  <div className="font-bold text-primary">₹{(customerSummary.lastMonthBalance || 0).toFixed(2)}</div>
                </div>
                <div className="p-3 bg-accent/5 rounded-lg">
                  <div className="text-sm text-muted-foreground">Current Bills</div>
                  <div className="font-bold text-accent">₹{customerSummary.totalBills.toFixed(2)}</div>
                </div>
                <div className="p-3 bg-destructive/5 rounded-lg">
                  <div className="text-sm text-muted-foreground">Current Balance</div>
                  <div className="font-bold text-destructive">₹{customerSummary.currentBalance.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

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
          {customerSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Balance Summary - {customerSummary.customerName}</span>
                  <Button 
                    onClick={handleGenerateLastBalancePDF}
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
                    <div className="text-sm text-muted-foreground">Last Balance</div>
                    <div className="font-bold text-primary">₹{(customerSummary.lastMonthBalance || 0).toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-accent/5 rounded-lg">
                    <div className="text-sm text-muted-foreground">Current Bills</div>
                    <div className="font-bold text-accent">₹{customerSummary.totalBills.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-destructive/5 rounded-lg">
                    <div className="text-sm text-muted-foreground">Current Balance</div>
                    <div className="font-bold text-destructive">₹{customerSummary.currentBalance.toFixed(2)}</div>
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