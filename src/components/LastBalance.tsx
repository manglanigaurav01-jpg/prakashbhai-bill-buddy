import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FileText, Download, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getCustomers, getCustomerBalance, getAllCustomerBalances } from "@/lib/storage";
import { generateCustomerSummaryPDF } from "@/lib/pdf";
import { Customer, CustomerBalance } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface LastBalanceProps {
  onNavigate: (view: 'create-bill' | 'customers' | 'balance' | 'amount-tracker' | 'dashboard' | 'total-business') => void;
}

export const LastBalance = ({ onNavigate }: LastBalanceProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [customerBalance, setCustomerBalance] = useState<CustomerBalance | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const customerList = getCustomers();
    setCustomers(customerList);
  }, []);

  useEffect(() => {
    if (selectedCustomer && startDate && endDate) {
      const balance = getCustomerBalance(selectedCustomer);
      setCustomerBalance(balance);
    } else {
      setCustomerBalance(null);
    }
  }, [selectedCustomer, startDate, endDate]);

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