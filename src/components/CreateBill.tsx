import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ArrowLeft, Plus, Trash2, FileDown, RotateCcw, Save, AlertCircle, CheckCircle2, Edit3 } from "lucide-react";
import { getCustomers, saveBill, saveCustomer } from "@/lib/storage";
import { saveDraft, getDraft, clearDraft, hasDraft } from "@/lib/draft";
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
  const [date, setDate] = useState<Date>(new Date());
  const [particulars, setParticulars] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [rate, setRate] = useState<number>(0);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Partial<BillItem>>({});
  
  // Loading and progress states
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);
  const [showDraftAlert, setShowDraftAlert] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    setCustomers(getCustomers());
    
    // Check for existing draft
    if (hasDraft()) {
      setShowDraftAlert(true);
    }
  }, []);

  // Auto-save draft functionality
  const autoSaveDraft = useCallback(() => {
    if (items.length > 0 || particulars || selectedCustomer) {
      setIsSavingDraft(true);
      const customer = customers.find(c => c.id === selectedCustomer);
      
      saveDraft({
        customerId: selectedCustomer,
        customerName: customer?.name || '',
        date: date.toISOString().split('T')[0],
        particulars,
        items,
        grandTotal: items.reduce((sum, item) => sum + item.total, 0),
      });
      
      setDraftSavedTime(new Date().toLocaleTimeString());
      setTimeout(() => setIsSavingDraft(false), 500);
    }
  }, [selectedCustomer, date, particulars, items, customers]);

  // Auto-save every 10 seconds when there's content
  useEffect(() => {
    const interval = setInterval(autoSaveDraft, 10000);
    return () => clearInterval(interval);
  }, [autoSaveDraft]);

  // Load draft function
  const loadDraft = () => {
    const draft = getDraft();
    if (draft) {
      setSelectedCustomer(draft.customerId);
      setDate(new Date(draft.date));
      setParticulars(draft.particulars);
      setItems(draft.items);
      setShowDraftAlert(false);
      toast({
        title: "Draft Loaded",
        description: "Your previous work has been restored",
      });
    }
  };

  const dismissDraft = () => {
    clearDraft();
    setShowDraftAlert(false);
  };

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
    
    // Trigger auto-save after adding item
    setTimeout(autoSaveDraft, 1000);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleEditItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      setEditingItem(id);
      setEditingValues(item);
    }
  };

  const handleSaveEdit = (id: string) => {
    if (editingValues.itemName && editingValues.quantity && editingValues.rate) {
      const updatedItems = items.map(item => 
        item.id === id 
          ? {
              ...item,
              itemName: editingValues.itemName!,
              quantity: editingValues.quantity!,
              rate: editingValues.rate!,
              total: editingValues.quantity! * editingValues.rate!,
            }
          : item
      );
      setItems(updatedItems);
      setEditingItem(null);
      setEditingValues({});
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditingValues({});
  };

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
  
  // Calculate current item total (real-time as user types)
  const currentItemTotal = (itemName && quantity > 0 && rate > 0) ? quantity * rate : 0;
  
  // Total including both table items and current item being typed
  const totalWithCurrentItem = grandTotal + currentItemTotal;

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

  const handleSavePDF = async () => {
    if (!selectedCustomer) {
      toast({
        title: "No Customer Selected",
        description: "Please select a customer first",
        variant: "destructive",
      });
      return;
    }

    // Check if we have items in table OR a current item being typed
    const hasTableItems = items.length > 0;
    const hasCurrentItem = itemName && quantity > 0 && rate > 0;
    
    if (!hasTableItems && !hasCurrentItem) {
      toast({
        title: "No Items to Save",
        description: "Please add at least one item or fill the current item fields",
        variant: "destructive",
      });
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer) return;

    setIsGeneratingPDF(true);
    setPdfProgress(0);

    try {
      // Simulate progress for better UX
      const progressSteps = [20, 40, 60, 80, 100];
      for (let i = 0; i < progressSteps.length; i++) {
        setPdfProgress(progressSteps[i]);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Prepare items for saving (include current item if exists and not in table)
      let itemsToSave = [...items];
      if (hasCurrentItem && !hasTableItems) {
        // If no table items but has current item, save the current item
        const currentItem: BillItem = {
          id: Date.now().toString(),
          itemName,
          quantity,
          rate,
          total: currentItemTotal,
        };
        itemsToSave = [currentItem];
      }

      // Save bill to storage
      const bill = saveBill({
        customerId: selectedCustomer,
        customerName: customer.name,
        date: date.toISOString().split('T')[0],
        particulars,
        items: itemsToSave,
        grandTotal: itemsToSave.reduce((sum, item) => sum + item.total, 0),
      });

      // Generate PDF
      const pdfResult = await generateBillPDF(bill);
      
      // Clear draft after successful save
      clearDraft();
      setDraftSavedTime(null);

      if (pdfResult.success) {
        toast({
          title: "✅ Bill Saved Successfully!",
          description: pdfResult.message,
          className: "animate-pulse-success",
        });
      } else {
        toast({
          title: "Error Saving PDF",
          description: pdfResult.message,
          variant: "destructive",
        });
      }

    } catch (error) {
      toast({
        title: "Error Generating PDF",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
      setPdfProgress(0);
    }
  };

  const handleClear = () => {
    setSelectedCustomer("");
    setDate(new Date());
    setParticulars("");
    setItems([]);
    setItemName("");
    setQuantity(1);
    setRate(0);
    setShowNewCustomer(false);
    setNewCustomerName("");
    setEditingItem(null);
    setEditingValues({});
    clearDraft();
    setDraftSavedTime(null);
    
    toast({
      title: "Form Cleared",
      description: "All fields have been reset",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto animate-fade-in">
        {/* Draft Alert */}
        {showDraftAlert && (
          <Card className="mb-6 border-warning bg-warning-soft animate-slide-up">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-medium">Unsaved Draft Found</p>
                    <p className="text-sm text-muted-foreground">
                      You have an unsaved bill draft. Would you like to continue working on it?
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={dismissDraft}>
                    Discard
                  </Button>
                  <Button size="sm" onClick={loadDraft}>
                    Load Draft
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Create New Bill</h1>
          
          {/* Auto-save indicator */}
          {draftSavedTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
              {isSavingDraft ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Saving draft...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  <span>Draft saved at {draftSavedTime}</span>
                </>
              )}
            </div>
          )}
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
                      <SelectTrigger className="min-h-[44px] touch-manipulation">
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
                    <Button
                      variant="outline"
                      onClick={() => setShowNewCustomer(true)}
                      className="min-h-[44px] touch-manipulation"
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
                      className="min-h-[44px] touch-manipulation"
                    />
                    <Button onClick={handleCreateCustomer} className="min-h-[44px] touch-manipulation">
                      Add
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewCustomer(false)}
                      className="min-h-[44px] touch-manipulation"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <DatePicker
                  date={date}
                  onDateChange={(newDate) => newDate && setDate(newDate)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="particulars">Particulars</Label>
                <Input
                  placeholder="Bill description"
                  value={particulars}
                  onChange={(e) => setParticulars(e.target.value)}
                  className="min-h-[44px] touch-manipulation"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Items</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Sr No</TableHead>
                      <TableHead className="min-w-40">Item Name</TableHead>
                      <TableHead className="w-24">Quantity</TableHead>
                      <TableHead className="w-24">Rate</TableHead>
                      <TableHead className="w-24">Total</TableHead>
                      <TableHead className="w-32">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {editingItem === item.id ? (
                            <Input
                              value={editingValues.itemName || item.itemName}
                              onChange={(e) => setEditingValues({...editingValues, itemName: e.target.value})}
                              className="min-h-[36px]"
                            />
                          ) : (
                            item.itemName
                          )}
                        </TableCell>
                        <TableCell>
                          {editingItem === item.id ? (
                            <Input
                              type="number"
                              value={editingValues.quantity || item.quantity}
                              onChange={(e) => setEditingValues({...editingValues, quantity: Number(e.target.value)})}
                              className="min-h-[36px]"
                            />
                          ) : (
                            item.quantity
                          )}
                        </TableCell>
                        <TableCell>
                          {editingItem === item.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editingValues.rate || item.rate}
                              onChange={(e) => setEditingValues({...editingValues, rate: Number(e.target.value)})}
                              className="min-h-[36px]"
                            />
                          ) : (
                            `₹${item.rate.toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell>₹{item.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {editingItem === item.id ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="min-h-[36px] touch-manipulation"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  className="min-h-[36px] touch-manipulation"
                                >
                                  ×
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditItem(item.id)}
                                  className="min-h-[36px] touch-manipulation"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="min-h-[36px] touch-manipulation"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
                      className="min-h-[44px] touch-manipulation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="min-h-[44px] touch-manipulation"
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
                      className="min-h-[44px] touch-manipulation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Total</Label>
                    <div className="min-h-[44px] flex items-center px-3 bg-muted rounded-md font-semibold text-accent">
                      ₹{currentItemTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={handleAddItem} 
                    className="flex-1 min-h-[44px] touch-manipulation"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Table
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* PDF Generation Progress */}
            {isGeneratingPDF && (
              <Card className="animate-fade-in">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <LoadingSpinner />
                      <span className="font-medium">Generating PDF...</span>
                    </div>
                    <ProgressBar 
                      progress={pdfProgress} 
                      showLabel 
                      label="PDF Generation Progress"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Grand Total and Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t">
              <div className="text-2xl font-bold animate-pulse-success">
                Grand Total: ₹{totalWithCurrentItem.toFixed(2)}
                {currentItemTotal > 0 && items.length > 0 && (
                  <div className="text-sm font-normal text-muted-foreground">
                    (Table: ₹{grandTotal.toFixed(2)} + Current: ₹{currentItemTotal.toFixed(2)})
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  onClick={autoSaveDraft}
                  disabled={isSavingDraft}
                  className="min-h-[44px] touch-manipulation"
                >
                  {isSavingDraft ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Draft
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClear}
                  className="min-h-[44px] touch-manipulation"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button 
                  onClick={handleSavePDF} 
                  disabled={(!items.length && !currentItemTotal) || !selectedCustomer || isGeneratingPDF}
                  className="min-h-[44px] touch-manipulation"
                >
                  {isGeneratingPDF ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  {isGeneratingPDF ? 'Generating...' : 'Save as PDF'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};