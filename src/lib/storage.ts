import { Customer, Bill, Payment, CustomerBalance, ItemMaster, ItemRateHistory, ItemUsage, BillItem } from '@/types';

const STORAGE_KEYS = {
  CUSTOMERS: 'prakash_customers',
  BILLS: 'prakash_bills',
  PAYMENTS: 'prakash_payments',
  ITEMS: 'prakash_items',
  ITEM_RATE_HISTORY: 'prakash_item_rate_history',
};

// Customer management
export const getCustomers = (): Customer[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  return data ? JSON.parse(data) : [];
};

export const saveCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>): Customer => {
  const customers = getCustomers();
  const normalizedNewName = customer.name.trim().toLowerCase();
  const isDuplicate = customers.some(c => c.name.trim().toLowerCase() === normalizedNewName);
  if (isDuplicate) {
    throw new Error('DUPLICATE_CUSTOMER_NAME');
  }
  const newCustomer: Customer = {
    ...customer,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  customers.push(newCustomer);
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  return newCustomer;
};

// Bill management
export const getBills = (): Bill[] => {
  const data = localStorage.getItem(STORAGE_KEYS.BILLS);
  return data ? JSON.parse(data) : [];
};

export const saveBill = (bill: Omit<Bill, 'id' | 'createdAt'>): Bill => {
  const bills = getBills();
  const newBill: Bill = {
    ...bill,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  bills.push(newBill);
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  return newBill;
};

export const updateBill = (billId: string, updates: Partial<Omit<Bill, 'id' | 'createdAt'>>): Bill | null => {
  const bills = getBills();
  const index = bills.findIndex(b => b.id === billId);
  if (index === -1) return null;
  const oldBill = bills[index];
  const updated: Bill = {
    ...oldBill,
    ...updates,
  };
  bills[index] = updated;
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  return updated;
};

export const deleteBill = (billId: string): void => {
  const bills = getBills().filter(b => b.id !== billId);
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
};

// Payment management
export const getPayments = (): Payment[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
  return data ? JSON.parse(data) : [];
};

export const savePayment = (payment: Omit<Payment, 'id' | 'createdAt'>): Payment => {
  const payments = getPayments();
  const newPayment: Payment = {
    ...payment,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  payments.push(newPayment);
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  return newPayment;
};

export const recordPayment = (customerId: string, customerName: string, amount: number): Payment => {
  return savePayment({
    customerId,
    customerName,
    amount,
    date: new Date().toISOString(),
  });
};

export const getPaymentHistory = (): Payment[] => {
  return getPayments().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const deletePayment = (paymentId: string): void => {
  const payments = getPayments().filter(payment => payment.id !== paymentId);
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
};

// Balance calculations
export const getCustomerBalance = (customerId: string): CustomerBalance => {
  const bills = getBills().filter(bill => bill.customerId === customerId);
  const payments = getPayments().filter(payment => payment.customerId === customerId);
  const customer = getCustomers().find(c => c.id === customerId);
  
  const totalSales = bills.reduce((sum, bill) => sum + bill.grandTotal, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  return {
    customerId,
    customerName: customer?.name || 'Unknown',
    totalSales,
    totalPaid,
    pending: totalSales - totalPaid,
  };
};

// Get bills by customer
export const getBillsByCustomer = (customerId: string): Bill[] => {
  return getBills().filter(bill => bill.customerId === customerId);
};

export const getAllCustomerBalances = (): CustomerBalance[] => {
  const customers = getCustomers();
  return customers.map(customer => getCustomerBalance(customer.id));
};

// Item Master management
export const getItems = (): ItemMaster[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ITEMS);
  return data ? JSON.parse(data) : [];
};

export const saveItem = (item: Omit<ItemMaster, 'id' | 'createdAt' | 'updatedAt'>): ItemMaster => {
  const items = getItems();
  const normalizedNewName = item.name.trim().toLowerCase();
  const isDuplicate = items.some(existing => existing.name.trim().toLowerCase() === normalizedNewName);
  if (isDuplicate) {
    throw new Error('DUPLICATE_ITEM_NAME');
  }
  const newItem: ItemMaster = {
    ...item,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  items.push(newItem);
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  return newItem;
};

export const updateItem = (itemId: string, updates: Partial<Omit<ItemMaster, 'id' | 'createdAt'>>): ItemMaster | null => {
  const items = getItems();
  const itemIndex = items.findIndex(item => item.id === itemId);
  
  if (itemIndex === -1) return null;
  
  const oldItem = items[itemIndex];
  
  // Track rate history if rate is changing
  if (updates.rate && oldItem.rate && updates.rate !== oldItem.rate) {
    saveRateHistory({
      itemId,
      oldRate: oldItem.rate,
      newRate: updates.rate,
    });
  }
  
  const updatedItem = {
    ...oldItem,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  items[itemIndex] = updatedItem;
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  return updatedItem;
};

export const deleteItem = (itemId: string): void => {
  const items = getItems().filter(item => item.id !== itemId);
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
};

export const getItemById = (itemId: string): ItemMaster | null => {
  const items = getItems();
  return items.find(item => item.id === itemId) || null;
};

// Item rate history
export const getRateHistory = (): ItemRateHistory[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ITEM_RATE_HISTORY);
  return data ? JSON.parse(data) : [];
};

export const saveRateHistory = (history: Omit<ItemRateHistory, 'id' | 'changedAt'>): ItemRateHistory => {
  const histories = getRateHistory();
  const newHistory: ItemRateHistory = {
    ...history,
    id: Date.now().toString(),
    changedAt: new Date().toISOString(),
  };
  histories.push(newHistory);
  localStorage.setItem(STORAGE_KEYS.ITEM_RATE_HISTORY, JSON.stringify(histories));
  return newHistory;
};

export const getRateHistoryForItem = (itemId: string): ItemRateHistory[] => {
  return getRateHistory()
    .filter(history => history.itemId === itemId)
    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
};

// Item analytics
export const getItemUsageAnalytics = (): ItemUsage[] => {
  const bills = getBills();
  const items = getItems();
  const itemUsageMap = new Map<string, ItemUsage>();

  // Initialize all items
  items.forEach(item => {
    itemUsageMap.set(item.id, {
      itemId: item.id,
      itemName: item.name,
      usageCount: 0,
      totalQuantity: 0,
      totalRevenue: 0,
    });
  });

  // Calculate usage from bills
  bills.forEach(bill => {
    bill.items.forEach(billItem => {
      // Try to find matching item by name (legacy support)
      const matchingItem = items.find(item => 
        item.name.toLowerCase() === billItem.itemName.toLowerCase()
      );
      
      if (matchingItem) {
        const usage = itemUsageMap.get(matchingItem.id);
        if (usage) {
          usage.usageCount += 1;
          usage.totalQuantity += billItem.quantity;
          usage.totalRevenue += billItem.total;
        }
      } else {
        // Create entry for items not in master (legacy items)
        const existingLegacy = Array.from(itemUsageMap.values()).find(
          usage => usage.itemName.toLowerCase() === billItem.itemName.toLowerCase()
        );
        
        if (!existingLegacy) {
          itemUsageMap.set(`legacy_${billItem.itemName}`, {
            itemId: `legacy_${billItem.itemName}`,
            itemName: billItem.itemName,
            usageCount: 1,
            totalQuantity: billItem.quantity,
            totalRevenue: billItem.total,
          });
        } else {
          existingLegacy.usageCount += 1;
          existingLegacy.totalQuantity += billItem.quantity;
          existingLegacy.totalRevenue += billItem.total;
        }
      }
    });
  });

  return Array.from(itemUsageMap.values())
    .sort((a, b) => b.usageCount - a.usageCount);
};

export const getMostUsedItems = (limit: number = 10): ItemUsage[] => {
  return getItemUsageAnalytics().slice(0, limit);
};

export const searchItems = (query: string): ItemMaster[] => {
  if (!query.trim()) return getItems();
  
  const items = getItems();
  const searchTerm = query.toLowerCase();
  
  return items.filter(item =>
    item.name.toLowerCase().includes(searchTerm)
  ).sort((a, b) => {
    // Prioritize exact matches
    const aStartsWith = a.name.toLowerCase().startsWith(searchTerm);
    const bStartsWith = b.name.toLowerCase().startsWith(searchTerm);
    
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    return a.name.localeCompare(b.name);
  });
};