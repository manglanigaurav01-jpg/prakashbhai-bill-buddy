import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Customer, MonthlyBalance } from "@/types";
import { getCustomers, getBills, getPayments } from "@/lib/storage";
import { generateMonthlyBalances, getMonthLabel } from "@/lib/monthly-balance";

interface BalanceHistoryProps {
  onNavigate: (view: string) => void;
}

export const BalanceHistory = ({ onNavigate }: BalanceHistoryProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthlyBalances, setMonthlyBalances] = useState<MonthlyBalance[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const customerList = getCustomers();
        setCustomers(customerList);
        
        if (selectedCustomer) {
          const balances = await generateMonthlyBalances(selectedCustomer);
          // generateMonthlyBalances returns oldest -> newest; show newest first in the UI
          const sortedBalances = [...balances].reverse();
          setMonthlyBalances(sortedBalances);
          setAvailableMonths(sortedBalances.map(b => `${b.year}-${b.month}`));
        }
      } catch (error) {
        console.error('Error loading balance history:', error);
        toast({
          title: "Error",
          description: "Failed to load balance history",
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [selectedCustomer, toast]);

  const selectedBalance = selectedMonth && monthlyBalances ? 
    monthlyBalances.find(b => `${b.year}-${b.month}` === selectedMonth) : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Balance History</h1>
            <p className="text-muted-foreground">View historical balance sheets</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Customer</label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a customer" />
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a month" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map(month => (
                      <SelectItem key={month} value={month}>
                        {getMonthLabel(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedBalance && (
          <Card>
            <CardHeader>
              <CardTitle>{customers.find(c => c.id === selectedCustomer)?.name} - {getMonthLabel(selectedMonth)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-sm font-medium text-muted-foreground">Opening Balance</div>
                  <div className="text-2xl font-bold">₹{selectedBalance.openingBalance.toFixed(2)}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-sm font-medium text-muted-foreground">Closing Balance</div>
                  <div className="text-2xl font-bold">₹{selectedBalance.closingBalance.toFixed(2)}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-sm font-medium text-muted-foreground">Total Bills</div>
                  <div className="text-2xl font-bold">₹{selectedBalance.bills.toFixed(2)}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-sm font-medium text-muted-foreground">Total Payments</div>
                  <div className="text-2xl font-bold">₹{selectedBalance.payments.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};