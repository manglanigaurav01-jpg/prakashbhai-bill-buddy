import { useState, useEffect } from 'react';
import { Search, X, FileText, IndianRupee, User, Package, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getBills, getPayments, getCustomers, getItems } from '@/lib/storage';
import { searchBills, searchPayments, searchCustomers, type SearchFilters } from '@/lib/search';
import { Bill, Payment, Customer, ItemMaster } from '@/types';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (view: string, data?: any) => void;
}

export const GlobalSearch = ({ open, onOpenChange, onNavigate }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    bills: Bill[];
    payments: Payment[];
    customers: Customer[];
    items: ItemMaster[];
  }>({ bills: [], payments: [], customers: [], items: [] });
  const [category, setCategory] = useState<'all' | 'bills' | 'payments' | 'customers' | 'items'>('all');
  const [timeRange, setTimeRange] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const hasActiveFilters =
    timeRange !== 'all' ||
    !!minAmount ||
    !!maxAmount ||
    paymentMethod !== 'all' ||
    selectedTags.length > 0 ||
    category !== 'all';

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim() && !hasActiveFilters) {
        setResults({ bills: [], payments: [], customers: [], items: [] });
        return;
      }

      // Limit results for performance with large datasets (300+ customers, 50+ bills)
      const bills = getBills();
      const payments = getPayments();
      const customers = getCustomers();
      const items = getItems();

      const now = new Date();
      let dateFrom: Date | undefined;
      if (timeRange !== 'all') {
        dateFrom = new Date(now);
        switch (timeRange) {
          case '7d':
            dateFrom.setDate(now.getDate() - 7);
            break;
          case '30d':
            dateFrom.setDate(now.getDate() - 30);
            break;
          case '90d':
            dateFrom.setDate(now.getDate() - 90);
            break;
        }
      }

      const filters: SearchFilters = {
        query: query.trim() || undefined,
        dateFrom,
        dateTo: undefined,
        minAmount: minAmount ? Number(minAmount) || undefined : undefined,
        maxAmount: maxAmount ? Number(maxAmount) || undefined : undefined,
        paymentMethod: paymentMethod !== 'all' ? paymentMethod : undefined,
      };

      let billResults = searchBills(bills, filters);
      let paymentResults = searchPayments(payments, filters);
      const customerResults = searchCustomers(customers, query);
      const itemResults = items.filter((i) =>
        (query || '').trim()
          ? i.name.toLowerCase().includes(query.toLowerCase())
          : true
      );

      // Apply smart tag filters
      if (selectedTags.includes('high-value')) {
        billResults = billResults.filter((b) => b.grandTotal >= 50000);
        paymentResults = paymentResults.filter((p) => p.amount >= 50000);
      }
      if (selectedTags.includes('recent')) {
        const recentFrom = new Date();
        recentFrom.setDate(recentFrom.getDate() - 7);
        billResults = billResults.filter((b) => new Date(b.date) >= recentFrom);
        paymentResults = paymentResults.filter((p) => new Date(p.date) >= recentFrom);
      }

      // Category filter
      const MAX_RESULTS_PER_CATEGORY = 20;
      setResults({
        bills:
          category === 'all' || category === 'bills'
            ? billResults.slice(0, MAX_RESULTS_PER_CATEGORY)
            : [],
        payments:
          category === 'all' || category === 'payments'
            ? paymentResults.slice(0, MAX_RESULTS_PER_CATEGORY)
            : [],
        customers:
          category === 'all' || category === 'customers'
            ? customerResults.slice(0, MAX_RESULTS_PER_CATEGORY)
            : [],
        items:
          category === 'all' || category === 'items'
            ? itemResults.slice(0, MAX_RESULTS_PER_CATEGORY)
            : [],
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [query, timeRange, minAmount, maxAmount, paymentMethod, selectedTags, category, hasActiveFilters]);

  const handleClear = () => {
    setQuery('');
    setTimeRange('all');
    setMinAmount('');
    setMaxAmount('');
    setPaymentMethod('all');
    setSelectedTags([]);
    setCategory('all');
    setResults({ bills: [], payments: [], customers: [], items: [] });
  };

  const totalResults = 
    results.bills.length + 
    results.payments.length + 
    results.customers.length + 
    results.items.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Search & Filter</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bills, payments, customers, items..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-9"
              autoFocus
            />
            {(query || hasActiveFilters) && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center text-xs">
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Category</span>
            </div>
            <Select value={category} onValueChange={(value: any) => setCategory(value)}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="bills">Bills</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="items">Items</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Min ₹"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="h-8 w-[90px] text-xs"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Max ₹"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="h-8 w-[90px] text-xs"
              />
            </div>

            <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Smart tags:</span>
            <Button
              type="button"
              variant={selectedTags.includes('high-value') ? 'default' : 'outline'}
              size="xs"
              className="h-6 text-xs"
              onClick={() => toggleTag('high-value')}
            >
              High value (₹50k+)
            </Button>
            <Button
              type="button"
              variant={selectedTags.includes('recent') ? 'default' : 'outline'}
              size="xs"
              className="h-6 text-xs"
              onClick={() => toggleTag('recent')}
            >
              Recent (7 days)
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {!query && (
            <div className="text-center py-8 text-muted-foreground">
              Start typing to search...
            </div>
          )}

          {query && totalResults === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {results.bills.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                <FileText className="h-4 w-4" />
                Bills ({results.bills.length}{results.bills.length === 20 ? '+' : ''})
              </div>
              <div className="space-y-2">
                {results.bills.map(bill => (
                  <div
                    key={bill.id}
                    className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      onNavigate?.('edit-bills', bill);
                      onOpenChange(false);
                    }}
                  >
                    <div className="font-medium">{bill.customerName}</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{new Date(bill.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>₹{bill.grandTotal.toFixed(2)}</span>
                      {bill.grandTotal >= 50000 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          High value
                        </Badge>
                      )}
                    </div>
                    {bill.particulars && (
                      <div className="text-xs text-muted-foreground mt-1">{bill.particulars}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.payments.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                <IndianRupee className="h-4 w-4" />
                Payments ({results.payments.length}{results.payments.length === 20 ? '+' : ''})
              </div>
              <div className="space-y-2">
                {results.payments.map(payment => (
                  <div
                    key={payment.id}
                    className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      onNavigate?.('edit-payments');
                      onOpenChange(false);
                    }}
                  >
                    <div className="font-medium">{payment.customerName}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString()} • ₹{payment.amount.toFixed(2)}
                      {payment.paymentMethod && ` • ${payment.paymentMethod}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.customers.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                <User className="h-4 w-4" />
                Customers ({results.customers.length}{results.customers.length === 20 ? '+' : ''})
              </div>
              <div className="space-y-2">
                {results.customers.map(customer => (
                  <div
                    key={customer.id}
                    className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      onNavigate?.('customers');
                      onOpenChange(false);
                    }}
                  >
                    <div className="font-medium">{customer.name}</div>
                    {/* phone removed from customer display per settings */}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.items.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                <Package className="h-4 w-4" />
                Items ({results.items.length})
              </div>
              <div className="space-y-2">
                {results.items.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      onNavigate?.('item-master');
                      onOpenChange(false);
                    }}
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.type === 'fixed' ? `₹${item.rate}` : 'Variable price'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
