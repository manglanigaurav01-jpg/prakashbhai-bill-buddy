import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Edit, Trash2, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  getItems, 
  saveItem, 
  updateItem, 
  deleteItem, 
  getItemUsageAnalytics, 
  getMostUsedItems,
} from '@/lib/storage';
import { ItemMaster as ItemMasterType, ItemUsage } from '@/types';

export interface ItemMasterProps {
  onNavigate: (view: string) => void;
}

export const ItemMaster: React.FC<ItemMasterProps> = ({ onNavigate: _onNavigate }) => {
  const [items, setItems] = useState<ItemMasterType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemMasterType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'fixed' as 'fixed' | 'variable',
    rate: ''
  });

  useEffect(() => {
    loadItems();
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(t);
  }, []);

  const loadItems = () => {
    const loadedItems = getItems();
    setItems(loadedItems);
  };

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      toast({
        title: "Error",
        description: "Item name is required",
        variant: "destructive"
      });
      return;
    }

    if (newItem.type === 'fixed' && (!newItem.rate || parseFloat(newItem.rate) <= 0)) {
      toast({
        title: "Error",
        description: "Rate is required for fixed-price items",
        variant: "destructive"
      });
      return;
    }

    const itemData = {
      name: newItem.name.trim(),
      type: newItem.type,
      ...(newItem.type === 'fixed' && { rate: parseFloat(newItem.rate) })
    };

    try {
      saveItem(itemData);
      loadItems();
      setNewItem({ name: '', type: 'fixed', rate: '' });
      setShowAddForm(false);
      
      toast({
        title: "Success",
        description: "Item added successfully"
      });
    } catch (error: any) {
      if (error && error.message === 'DUPLICATE_ITEM_NAME') {
        toast({
          title: "An item with this name already exists",
          description: "Please use a different name",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add item",
          variant: "destructive"
        });
      }
    }
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;

    const updates = {
      name: editingItem.name.trim(),
      type: editingItem.type,
      ...(editingItem.type === 'fixed' && { rate: editingItem.rate })
    };

    updateItem(editingItem.id, updates);
    loadItems();
    setEditingItem(null);
    
    toast({
      title: "Success", 
      description: "Item updated successfully"
    });
  };

  const handleDeleteItem = (itemId: string) => {
    deleteItem(itemId);
    loadItems();
    setDeleteConfirm(null);
    
    toast({
      title: "Success",
      description: "Item deleted successfully"
    });
  };

  const ItemAnalytics = () => {
    const [analytics, setAnalytics] = useState<ItemUsage[]>([]);
    const [mostUsed, setMostUsed] = useState<ItemUsage[]>([]);

    useEffect(() => {
      if (showAnalytics) {
        const analyticsData = getItemUsageAnalytics();
        const mostUsedData = getMostUsedItems(5);
        setAnalytics(analyticsData);
        setMostUsed(mostUsedData);
      }
    }, [showAnalytics, items]);

    const totalItems = analytics.length;
    const fixedPriceItems = items.filter(item => item.type === 'fixed').length;
    const variablePriceItems = items.filter(item => item.type === 'variable').length;
    const totalRevenue = analytics.reduce((sum, item) => sum + item.totalRevenue, 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{fixedPriceItems}</div>
              <p className="text-sm text-muted-foreground">Fixed Price</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{variablePriceItems}</div>
              <p className="text-sm text-muted-foreground">Variable Price</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">₹{totalRevenue.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Most Used Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mostUsed.map((item, index) => (
                <div key={item.itemId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{item.itemName}</p>
                      <p className="text-sm text-muted-foreground">
                        Used {item.usageCount} times • Qty: {item.totalQuantity}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{item.totalRevenue.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
              {mostUsed.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No usage data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Items Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.map((item) => (
                <div key={item.itemId} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                  <div className="flex-1">
                    <p className="font-medium">{item.itemName}</p>
                  </div>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span>Uses: {item.usageCount}</span>
                    <span>Qty: {item.totalQuantity}</span>
                    <span className="font-medium">₹{item.totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (showAnalytics) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAnalytics(false)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Items
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Item Analytics</h1>
              <p className="text-muted-foreground">Performance insights for your items</p>
            </div>
          </div>
          <ItemAnalytics />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 sm:flex-none">
            <h1 className="text-xl sm:text-2xl font-bold">Item Master</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your inventory items and pricing</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowAnalytics(true)}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
            <Button onClick={() => setShowAddForm(true)} size="sm" className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Item</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            {filteredItems.length} items
          </div>
        </div>

        {/* Items List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={item.type === 'fixed' ? 'default' : 'secondary'}>
                        {item.type === 'fixed' ? '₹ Fixed' : '📝 Variable'}
                      </Badge>
                      {item.type === 'fixed' && item.rate && (
                        <span className="text-lg font-bold text-primary">₹{item.rate}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingItem(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Created: {formatDate(new Date(item.createdAt))}</div>
                  {item.updatedAt !== item.createdAt && (
                    <div>Updated: {formatDate(new Date(item.updatedAt))}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? 'No items found matching your search' : 'No items created yet'}
              </p>
              {!searchQuery && (
                <Button 
                  className="mt-4" 
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Item
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Create a new item for your inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Item Name</label>
              <Input
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter item name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price Type</label>
              <Select 
                value={newItem.type} 
                onValueChange={(value) => setNewItem(prev => ({ 
                  ...prev, 
                  type: value as 'fixed' | 'variable',
                  ...(value === 'variable' && { rate: '' })
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">₹ Fixed Price</SelectItem>
                  <SelectItem value="variable">📝 Variable Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newItem.type === 'fixed' && (
              <div>
                <label className="text-sm font-medium">Default Rate</label>
                <Input
                  type="number"
                  value={newItem.rate}
                  onChange={(e) => setNewItem(prev => ({ ...prev, rate: e.target.value }))}
                  placeholder="Enter default rate"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update item details
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Item Name</label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Price Type</label>
                <Select 
                  value={editingItem.type} 
                  onValueChange={(value) => setEditingItem(prev => prev ? { 
                    ...prev, 
                    type: value as 'fixed' | 'variable',
                    ...(value === 'variable' && { rate: undefined })
                  } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">₹ Fixed Price</SelectItem>
                    <SelectItem value="variable">📝 Variable Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingItem.type === 'fixed' && (
                <div>
                  <label className="text-sm font-medium">Rate</label>
                  <Input
                    type="number"
                    value={editingItem.rate || ''}
                    onChange={(e) => setEditingItem(prev => prev ? { 
                      ...prev, 
                      rate: e.target.value ? parseFloat(e.target.value) : undefined 
                    } : null)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem}>Update Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirm && handleDeleteItem(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};