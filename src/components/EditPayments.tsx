import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search, SortAsc, SortDesc, Edit3, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { getPayments, getCustomers, updatePayment, deletePayment } from '@/lib/storage';
import { Customer, Payment } from '@/types';


interface EditPaymentsProps {
  onNavigate: (view: string) => void;
}

type SortKey = 'date' | 'customerName' | 'amount';

export const EditPayments: React.FC<EditPaymentsProps> = ({ onNavigate }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Payment | null>(null);
  const [editingDate, setEditingDate] = useState<Date>(new Date());
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const allPayments = getPayments();
        const allCustomers = getCustomers();
        
        console.log('Loaded payments:', allPayments); // Debug log
        console.log('Loaded customers:', allCustomers); // Debug log
        
        setPayments(allPayments);
        setCustomers(allCustomers);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load payments and customers');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Add event listener for storage changes
    window.addEventListener('storage', loadData);
    
    return () => {
      window.removeEventListener('storage', loadData);
    };
  }, []);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = payments.filter(p => {
      const matchesText = !q || p.customerName.toLowerCase().includes(q);
      const matchesDate = !filterDate || (new Date(p.date).toDateString() === filterDate.toDateString());
      return matchesText && matchesDate;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'date') {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sortAsc ? da - db : db - da;
      }
      if (sortKey === 'customerName') {
        const ca = a.customerName.toLowerCase();
        const cb = b.customerName.toLowerCase();
        return sortAsc ? ca.localeCompare(cb) : cb.localeCompare(ca);
      }
      // amount
      return sortAsc ? a.amount - b.amount : b.amount - a.amount;
    });
    return sorted;
  }, [payments, query, sortKey, sortAsc, filterDate]);

  const startEdit = (payment: Payment) => {
    setEditing(payment);
    setEditingDate(new Date(payment.date));
    const cust = customers.find(c => c.id === payment.customerId) || null;
    setEditingCustomer(cust);
    setEditingAmount(payment.amount.toString());
  };

  const saveEdit = () => {
    if (!editing) return;
    if (!editingCustomer) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }
    const amt = parseFloat(editingAmount);
    if (!amt || amt <= 0) {
      toast({ title: 'Error', description: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    const updated = updatePayment(editing.id, {
      customerId: editingCustomer.id,
      customerName: editingCustomer.name,
      amount: amt,
      date: editingDate.toISOString().split('T')[0],
    });
    if (updated) {
      setPayments(getPayments());
      toast({ title: 'Payment updated', description: `Payment for ${updated.customerName} updated successfully` });
      setEditing(null);
    } else {
      toast({ title: 'Error', description: 'Failed to update payment', variant: 'destructive' });
    }
  };

  // Long press delete
  const timers = useRef<{ [key: string]: any }>({});
  const LONG_PRESS_MS = 600;
  const pressStart = (id: string) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => setShowDeleteId(id), LONG_PRESS_MS);
  };
  const pressEnd = (id: string) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      timers.current[id] = null;
    }
  };

  const confirmDelete = () => {
    if (!showDeleteId) return;
    deletePayment(showDeleteId);
    setPayments(getPayments());
    setShowDeleteId(null);
    toast({ title: 'Payment deleted', description: 'The payment has been removed' });
  };

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Amt Paid</h1>
              <p className="text-muted-foreground">Loading payments...</p>
            </div>
          </div>
          <div className="text-center py-8">
            <div className="text-lg">Loading payments and customers...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Amt Paid</h1>
              <p className="text-muted-foreground">Error loading data</p>
            </div>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-red-600 mb-4">{error}</div>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Amt Paid</h1>
            <p className="text-muted-foreground">Filter, edit or delete payments</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by customer name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div>
              <Label className="mb-1 block">Date</Label>
              <DatePicker date={filterDate || undefined} onDateChange={(d) => setFilterDate(d || null)} placeholder="Filter by date" />
            </div>
            <div className="flex gap-2">
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="min-w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="customerName">Sort by Customer</SelectItem>
                  <SelectItem value="amount">Sort by Amount</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setSortAsc(s => !s)}>
                {sortAsc ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        {payments.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                Debug: Found {payments.length} payments, showing {filteredSorted.length} after filtering
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {filteredSorted.map((p) => (
            <Card key={p.id}
              onMouseDown={() => pressStart(p.id)}
              onMouseUp={() => pressEnd(p.id)}
              onTouchStart={() => pressStart(p.id)}
              onTouchEnd={() => pressEnd(p.id)}
              className="hover:shadow-md transition-all duration-200 active:scale-95">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">{formatDate(new Date(p.date))}</div>
                  <div className="text-lg font-semibold">{p.customerName}</div>
                  <div className="text-sm text-muted-foreground">Amount: ₹{p.amount.toFixed(2)}</div>
                </div>
                <div>
                  <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                    <Edit3 className="w-4 h-4 mr-1" /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredSorted.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">No payments found</CardContent>
            </Card>
          )}
        </div>

        <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
              <DialogDescription>Update payment details</DialogDescription>
            </DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Date</Label>
                    <DatePicker date={editingDate} onDateChange={(d) => d && setEditingDate(d)} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Customer</Label>
                    <Select value={editingCustomer?.id || ''} onValueChange={(id) => setEditingCustomer(customers.find(c => c.id === id) || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={editingAmount} onChange={(e) => setEditingAmount(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button onClick={saveEdit}><Save className="w-4 h-4 mr-1" />Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!showDeleteId} onOpenChange={(open) => { if (!open) setShowDeleteId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Payment</DialogTitle>
              <DialogDescription>Are you sure you want to delete this payment?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};


