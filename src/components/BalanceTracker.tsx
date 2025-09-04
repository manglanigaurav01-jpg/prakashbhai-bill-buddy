import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CreditCard, DollarSign, AlertCircle, TrendingUp } from "lucide-react";
import { getCustomers, savePayment, getCustomerBalance, getAllCustomerBalances } from "@/lib/storage";
import { Customer, CustomerBalance } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface BalanceTrackerProps {
  onNavigate: (view: 'create-bill' | 'customers' | 'balance' | 'dashboard') => void;
}

export const BalanceTracker = ({ onNavigate }: BalanceTrackerProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [customerBalance, setCustomerBalance] = useState<CustomerBalance | null>(null);
  const [allBalances, setAllBalances] = useState<CustomerBalance[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const customerList = getCustomers();
    setCustomers(customerList);
    setAllBalances(getAllCustomerBalances());
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      const balance = getCustomerBalance(selectedCustomer);
      setCustomerBalance(balance);
    } else {
      setCustomerBalance(null);
    }
  }, [selectedCustomer]);

  const handleRecordPayment = () => {
    if (!selectedCustomer) {
      toast({
        title: "No Customer Selected",
        description: "Please select a customer first",
        variant: "destructive",
      });
      return;
    }

    if (paymentAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    savePayment({
      customerId: selectedCustomer,
      customerName: customer.name,
      amount: paymentAmount,
      date: new Date().toISOString().split('T')[0],
    });

    // Refresh balances
    const updatedBalance = getCustomerBalance(selectedCustomer);
    setCustomerBalance(updatedBalance);
    setAllBalances(getAllCustomerBalances());
    setPaymentAmount(0);

    toast({
      title: "Payment Recorded",
      description: `Payment of ₹${paymentAmount} recorded for ${customer.name}`,
    });
  };

  const overallSummary = allBalances.reduce(
    (summary, balance) => ({
      totalSales: summary.totalSales + balance.totalSales,
      totalPaid: summary.totalPaid + balance.totalPaid,
      totalPending: summary.totalPending + balance.pending,
    }),
    { totalSales: 0, totalPaid: 0, totalPending: 0 }
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Balance Tracker</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Recording */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Record Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
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
                    <Label>Amount Paid (₹)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        placeholder="Enter amount"
                      />
                      <Button onClick={handleRecordPayment} disabled={!selectedCustomer || paymentAmount <= 0}>
                        Record Payment
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Balance Details */}
            {customerBalance && (
              <Card>
                <CardHeader>
                  <CardTitle>Balance Details - {customerBalance.customerName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    readOnly
                    value={`Customer: ${customerBalance.customerName}
Total Sales: ₹${customerBalance.totalSales.toFixed(2)}
Total Paid: ₹${customerBalance.totalPaid.toFixed(2)}
Pending Amount: ₹${customerBalance.pending.toFixed(2)}

Payment Status: ${customerBalance.pending > 0 ? 'Outstanding' : 'Cleared'}`}
                    className="h-32"
                  />
                </CardContent>
              </Card>
            )}

            {/* Per-Customer Summary */}
            <Card>
              <CardHeader>
                <CardTitle>All Customers Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allBalances.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No customer data available</p>
                  ) : (
                    allBalances.map(balance => (
                      <div
                        key={balance.customerId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="font-medium">{balance.customerName}</div>
                        <div className="flex gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Sales: ₹{balance.totalSales.toFixed(2)}
                          </span>
                          <span className="text-accent">
                            Paid: ₹{balance.totalPaid.toFixed(2)}
                          </span>
                          <span className={`font-medium ${balance.pending > 0 ? 'text-destructive' : 'text-accent'}`}>
                            Pending: ₹{balance.pending.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overall Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Overall Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                    <span className="font-medium">Total Sales</span>
                    <span className="font-bold text-primary">₹{overallSummary.totalSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                    <span className="font-medium">Total Paid</span>
                    <span className="font-bold text-accent">₹{overallSummary.totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-destructive/5 rounded-lg">
                    <span className="font-medium">Total Pending</span>
                    <span className="font-bold text-destructive">₹{overallSummary.totalPending.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {overallSummary.totalPending > 0 && (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Outstanding Amount</span>
                  </div>
                  <p className="text-2xl font-bold text-destructive mt-2">
                    ₹{overallSummary.totalPending.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {allBalances.filter(b => b.pending > 0).length} customers have pending payments
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};