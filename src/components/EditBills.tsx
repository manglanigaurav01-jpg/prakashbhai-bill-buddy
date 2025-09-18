import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Edit3, Trash2, Search, SortAsc, SortDesc, Save, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { getBills, getCustomers, saveBill, updateBill, deleteBill } from '@/lib/storage';
import { Bill, BillItem, Customer } from '@/types';

interface EditBillsProps {
  onNavigate: (view: string) => void;
}

type SortKey = 'date' | 'customerName';

export const EditBills: React.FC<EditBillsProps> = ({ onNavigate }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [editingItems, setEditingItems] = useState<BillItem[]>([]);
  const [editingDate, setEditingDate] = useState<Date>(new Date());
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setBills(getBills());
    setCustomers(getCustomers());
  }, []);

  const filteredSortedBills = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = bills.filter(b =>
      !q || b.customerName.toLowerCase().includes(q) || b.items.some(i => i.itemName.toLowerCase().includes(q))
    );
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'date') {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sortAsc ? da - db : db - da;
      } else {
        const ca = a.customerName.toLowerCase();
        const cb = b.customerName.toLowerCase();
        return sortAsc ? ca.localeCompare(cb) : cb.localeCompare(ca);
      }
    });
    return sorted;
  }, [bills, query, sortKey, sortAsc]);

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const startEdit = (bill: Bill) => {
    setEditing(bill);
    setEditingItems(bill.items.map(i => ({ ...i })));
    setEditingDate(new Date(bill.date));
    const cust = customers.find(c => c.id === bill.customerId) || null;
    setEditingCustomer(cust);
  };

  const addItemRow = () => {
    const newItem: BillItem = { id: Date.now().toString(), itemName: '', quantity: 0, rate: 0, total: 0 };
    setEditingItems(prev => [...prev, newItem]);
  };

  const updateItemField = (id: string, field: keyof BillItem, value: string) => {
    setEditingItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const updated: BillItem = { ...it, [field]: field === 'itemName' ? value : Number(value) } as BillItem;
      if (field === 'quantity' || field === 'rate') {
        const quantity = field === 'quantity' ? Number(value) : updated.quantity;
        const rate = field === 'rate' ? Number(value) : updated.rate;
        updated.total = Number(quantity) * Number(rate);
      }
      return updated;
    }));
  };

  const removeItemRow = (id: string) => {
    setEditingItems(prev => prev.filter(i => i.id !== id));
  };

  const saveEdit = () => {
    if (!editing) return;
    if (!editingCustomer) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }
    const hasInvalid = editingItems.some(i => !i.itemName.trim() || i.quantity <= 0 || i.rate <= 0);
    if (hasInvalid) {
      toast({ title: 'Error', description: 'Please fill all item fields with valid values', variant: 'destructive' });
      return;
    }
    const updated = updateBill(editing.id, {
      customerId: editingCustomer.id,
      customerName: editingCustomer.name,
      date: editingDate.toISOString().split('T')[0],
      items: editingItems,
      grandTotal: editingItems.reduce((s, it) => s + it.total, 0),
    });
    if (updated) {
      setBills(getBills());
      toast({ title: 'Bill updated', description: `Bill for ${updated.customerName} updated successfully` });
      setEditing(null);
    } else {
      toast({ title: 'Error', description: 'Failed to update bill', variant: 'destructive' });
    }
  };

  // Long press detection for delete
  const longPressTimers = useRef<{ [key: string]: any }>({});
  const LONG_PRESS_MS = 600;

  const handlePressStart = (id: string) => {
    if (longPressTimers.current[id]) clearTimeout(longPressTimers.current[id]);
    longPressTimers.current[id] = setTimeout(() => setShowDeleteId(id), LONG_PRESS_MS);
  };
  const handlePressEnd = (id: string) => {
    if (longPressTimers.current[id]) {
      clearTimeout(longPressTimers.current[id]);
      longPressTimers.current[id] = null;
    }
  };

  const confirmDelete = () => {
    if (!showDeleteId) return;
    deleteBill(showDeleteId);
    setBills(getBills());
    setShowDeleteId(null);
    toast({ title: 'Bill deleted', description: 'The bill has been removed' });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Bills</h1>
            <p className="text-muted-foreground">Search, sort, edit or delete bills</p>
          </div>
        </div>

        {/* Search and Sort */}
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer or item..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="min-w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="customerName">Sort by Customer</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setSortAsc(s => !s)}>
                {sortAsc ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bills List */}
        <div className="space-y-3">
          {filteredSortedBills.map((bill) => (
            <Card key={bill.id}
              onMouseDown={() => handlePressStart(bill.id)}
              onMouseUp={() => handlePressEnd(bill.id)}
              onTouchStart={() => handlePressStart(bill.id)}
              onTouchEnd={() => handlePressEnd(bill.id)}
              className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{formatDate(new Date(bill.date))}</div>
                    <div className="text-lg font-semibold">{bill.customerName}</div>
                    <div className="text-sm text-muted-foreground">Items: {bill.items.length} • Total: ₹{bill.grandTotal.toFixed(2)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(bill)}>
                      <Edit3 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredSortedBills.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">No bills found</CardContent>
            </Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Bill</DialogTitle>
              <DialogDescription>Update bill details</DialogDescription>
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Items</Label>
                    <Button size="sm" variant="outline" onClick={addItemRow}><Plus className="w-4 h-4 mr-1" />Add</Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-28">Rate</TableHead>
                        <TableHead className="w-28">Total</TableHead>
                        <TableHead className="w-20">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingItems.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell>
                            <Input value={it.itemName} onChange={(e) => updateItemField(it.id, 'itemName', e.target.value)} placeholder="Item name" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={it.quantity} onChange={(e) => updateItemField(it.id, 'quantity', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" value={it.rate} onChange={(e) => updateItemField(it.id, 'rate', e.target.value)} />
                          </TableCell>
                          <TableCell className="font-medium">₹{it.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => removeItemRow(it.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button onClick={saveEdit}><Save className="w-4 h-4 mr-1" />Save</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <Dialog open={!!showDeleteId} onOpenChange={(open) => { if (!open) setShowDeleteId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Bill</DialogTitle>
              <DialogDescription>Are you sure you want to delete this bill?</DialogDescription>
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


