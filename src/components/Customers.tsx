import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, User } from "lucide-react";
import { getCustomers, saveCustomer } from "@/lib/storage";
import { Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { addToRecycleBin } from "@/lib/recycle-bin";
import { hapticSuccess, hapticError, hapticMedium } from '@/lib/haptics';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CustomersProps {
  onNavigate: (view: 'create-bill' | 'customers' | 'balance' | 'dashboard') => void;
}

export const Customers = ({ onNavigate }: CustomersProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [startIdx, setStartIdx] = useState(0);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const { toast } = useToast();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    setCustomers(getCustomers());
  }, []);

  const handleAddCustomer = () => {
    if (!newCustomerName.trim()) {
      toast({
        title: "Invalid Customer Name",
        description: "Please enter a customer name",
        variant: "destructive",
      });
      return;
    }

    try {
      const customer = saveCustomer({ 
        name: newCustomerName.trim()
      });
      setCustomers([...customers, customer]);
      setNewCustomerName("");
      hapticSuccess();
      toast({
        title: "Customer Added",
        description: `${customer.name} has been added successfully`,
      });
    } catch (error: any) {
      hapticError();
      if (error && error.message === 'DUPLICATE_CUSTOMER_NAME') {
        toast({
          title: "A customer with this name already exists",
          description: "Please use a different name",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add customer",
          variant: "destructive",
        });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomer();
    }
  };

  const handleLongPressStart = (customer: Customer) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      hapticMedium();
      setCustomerToDelete(customer);
    }, 500); // 500ms long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;

    try {
      // Add to recycle bin
      addToRecycleBin('customer', customerToDelete, customerToDelete.name);

      // Remove from local state and storage
      const updatedCustomers = customers.filter(c => c.id !== customerToDelete.id);
      setCustomers(updatedCustomers);
      localStorage.setItem('customers', JSON.stringify(updatedCustomers));

      hapticSuccess();
      toast({
        title: "Customer Deleted",
        description: `${customerToDelete.name} has been moved to recycle bin`,
      });

      setCustomerToDelete(null);
    } catch (error) {
      hapticError();
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Customer Management</h1>
        </div>

        <div className="space-y-6">
          {/* Add Customer Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    placeholder="Enter customer name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="mt-1"
                  />
                </div>

                <Button onClick={handleAddCustomer} disabled={!newCustomerName.trim()} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer List ({customers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No customers added yet</p>
                  <p className="text-sm">Add your first customer above</p>
                </div>
              ) : (
                <div
                  ref={listRef}
                  className="overflow-auto"
                  style={{ maxHeight: '480px' }}
                  onScroll={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    const ITEM_H = 72;
                    const newStart = Math.floor(el.scrollTop / ITEM_H);
                    setStartIdx(newStart);
                  }}
                >
                  {(() => {
                    const ITEM_H = 72;
                    const overscan = 4;
                    const total = customers.length;
                    const containerH = listRef.current ? listRef.current.getBoundingClientRect().height : 480;
                    const visible = Math.ceil(containerH / ITEM_H) + overscan * 2;
                    const rs = Math.max(0, startIdx - overscan);
                    const re = Math.min(total, rs + visible);
                    const top = rs * ITEM_H;
                    const bottom = Math.max(0, (total - re) * ITEM_H);
                    const slice = customers.slice(rs, re);
                    return (
                      <div>
                        <div style={{ height: top }} />
                        <div className="space-y-2">
                          {slice.map((customer, idx) => (
                            <div
                              key={customer.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors active:bg-muted cursor-pointer select-none"
                              onTouchStart={() => handleLongPressStart(customer)}
                              onTouchEnd={handleLongPressEnd}
                              onTouchCancel={handleLongPressEnd}
                              onMouseDown={() => handleLongPressStart(customer)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">{rs + idx + 1}</span>
                                </div>
                                <div>
                                  <p className="font-medium">{customer.name}</p>
                                  <p className="text-sm text-muted-foreground">Added on {new Date(customer.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ height: bottom }} />
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{customerToDelete?.name}"? This customer will be moved to the recycle bin for 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};