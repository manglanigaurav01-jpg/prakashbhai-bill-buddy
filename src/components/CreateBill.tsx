import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, FileDown, RotateCcw } from "lucide-react";
import { getCustomers, saveBill, saveCustomer } from "@/lib/storage";
import { generateBillPDF } from "@/lib/pdf";
import { Customer, BillItem } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface CreateBillProps {
  onNavigate: (view: 'create-bill' | 'customers' | 'balance' | 'dashboard') => void;
}

export const CreateBill = ({ onNavigate }: CreateBillProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [particulars, setParticulars] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [rate, setRate] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    setCustomers(getCustomers());
  }, []);

  const handleAddItem = () => {
    if (!itemName || quantity <= 0 || rate <= 0) {
      toast({
        title: "Invalid Item",
        description: "Please fill all item fields with valid values",
        variant: "destructive",
      });
      return;
    }

    const newItem: BillItem = {
      id: Date.now().toString(),
      itemName,
      quantity,
      rate,
      total: quantity * rate,
    };

    setItems([...items, newItem]);
    setItemName("");
    setQuantity(1);
    setRate(0);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  const handleCreateCustomer = () => {
    if (!newCustomerName.trim()) {
      toast({
        title: "Invalid Customer Name",
        description: "Please enter a customer name",
        variant: "destructive",
      });
      return;
    }

    const customer = saveCustomer({ name: newCustomerName.trim() });
    setCustomers([...customers, customer]);
    setSelectedCustomer(customer.id);
    setNewCustomerName("");
    setShowNewCustomer(false);
    toast({
      title: "Customer Created",
      description: `${customer.name} has been added successfully`,
    });
  };

  const handleSavePDF = () => {
    if (!selectedCustomer || items.length === 0) {
      toast({
        title: "Incomplete Bill",
        description: "Please select a customer and add at least one item",
        variant: "destructive",
      });
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    // Save bill to storage
    const bill = saveBill({
      customerId: selectedCustomer,
      customerName: customer.name,
      date,
      particulars,
      items,
      grandTotal,
    });

    // Generate PDF
    generateBillPDF(bill);

    toast({
      title: "Bill Saved",
      description: "Bill has been saved and PDF generated successfully",
    });
  };

  const handleClear = () => {
    setSelectedCustomer("");
    setDate(new Date().toISOString().split('T')[0]);
    setParticulars("");
    setItems([]);
    setItemName("");
    setQuantity(1);
    setRate(0);
    setShowNewCustomer(false);
    setNewCustomerName("");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Create New Bill</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bill Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                {!showNewCustomer ? (
                  <div className="flex gap-2">
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
                        <SelectItem value="create-new">Create New...</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => setShowNewCustomer(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="New customer name"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                    />
                    <Button onClick={handleCreateCustomer}>Add</Button>
                    <Button variant="outline" onClick={() => setShowNewCustomer(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="particulars">Particulars</Label>
                <Input
                  placeholder="Bill description"
                  value={particulars}
                  onChange={(e) => setParticulars(e.target.value)}
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sr No</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{item.rate.toFixed(2)}</TableCell>
                      <TableCell>₹{item.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Add Item Form */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Item Name</Label>
                    <Input
                      placeholder="Item name"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddItem} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grand Total and Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t">
              <div className="text-2xl font-bold">
                Grand Total: ₹{grandTotal.toFixed(2)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClear}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button onClick={handleSavePDF} disabled={items.length === 0 || !selectedCustomer}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Save as PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};