import { Customer, Bill, Payment, CustomerBalance, ItemMaster, ItemRateHistory, ItemUsage, BillItem, Staff, AttendanceRecord } from '@/types';

const STORAGE_KEYS = {
  CUSTOMERS: 'prakash_customers',
  BILLS: 'prakash_bills',
  PAYMENTS: 'prakash_payments',
  ITEMS: 'prakash_items',
  ITEM_RATE_HISTORY: 'prakash_item_rate_history',
  STAFF: 'prakash_staff',
  ATTENDANCE: 'prakash_attendance',
};

// Customer management
export const getCustomers = (): Customer[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  return data ? JSON.parse(data) : [];
};

export const saveCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>): Customer => {
  const customers = getCustomers();
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

// Staff Management Functions
export const getStaff = (): Staff[] => {
  const staff = localStorage.getItem(STORAGE_KEYS.STAFF);
  return staff ? JSON.parse(staff) : [];
};

export const saveStaff = (staff: Omit<Staff, 'id' | 'createdAt'>): Staff => {
  const allStaff = getStaff();
  const newStaff: Staff = {
    ...staff,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  
  allStaff.push(newStaff);
  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(allStaff));
  return newStaff;
};

export const deleteStaff = (staffId: string): void => {
  const allStaff = getStaff();
  const updatedStaff = allStaff.filter(s => s.id !== staffId);
  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(updatedStaff));
  
  // Also remove all attendance records for this staff
  const attendance = getAttendanceRecords();
  const updatedAttendance = attendance.filter(a => a.staffId !== staffId);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updatedAttendance));
};

// Attendance Management Functions
export const getAttendanceRecords = (): AttendanceRecord[] => {
  const attendance = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  return attendance ? JSON.parse(attendance) : [];
};

export const saveAttendanceRecord = (record: Omit<AttendanceRecord, 'id' | 'createdAt'>): AttendanceRecord => {
  const allRecords = getAttendanceRecords();
  const newRecord: AttendanceRecord = {
    ...record,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  
  allRecords.push(newRecord);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(allRecords));
  return newRecord;
};

export const getAttendanceByStaff = (staffId: string): AttendanceRecord[] => {
  const allRecords = getAttendanceRecords();
  return allRecords
    .filter(record => record.staffId === staffId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getAttendanceByDate = (date: string): AttendanceRecord[] => {
  const allRecords = getAttendanceRecords();
  return allRecords.filter(record => record.date.split('T')[0] === date);
};

export const updateAttendanceRecord = (recordId: string, updates: Partial<Omit<AttendanceRecord, 'id' | 'createdAt'>>): AttendanceRecord | null => {
  const allRecords = getAttendanceRecords();
  const recordIndex = allRecords.findIndex(record => record.id === recordId);
  
  if (recordIndex === -1) {
    return null;
  }
  
  allRecords[recordIndex] = { ...allRecords[recordIndex], ...updates };
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(allRecords));
  return allRecords[recordIndex];
};

export const deleteAttendanceRecord = (recordId: string): void => {
  const allRecords = getAttendanceRecords();
  const updatedRecords = allRecords.filter(record => record.id !== recordId);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updatedRecords));
};

export const getStaffAttendanceSummary = (staffId: string, month?: number, year?: number): {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  totalRegularHours: number;
  totalExtraHours: number;
  attendanceRate: number;
} => {
  const allRecords = getAttendanceByStaff(staffId);
  
  let filteredRecords = allRecords;
  if (month !== undefined && year !== undefined) {
    filteredRecords = allRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getMonth() === month && recordDate.getFullYear() === year;
    });
  }
  
  const totalDays = filteredRecords.length;
  const presentDays = filteredRecords.filter(record => record.status === 'present').length;
  const absentDays = totalDays - presentDays;
  const totalRegularHours = filteredRecords.reduce((sum, record) => sum + record.regularHours, 0);
  const totalExtraHours = filteredRecords.reduce((sum, record) => sum + record.extraHours, 0);
  const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
  
  return {
    totalDays,
    presentDays,
    absentDays,
    totalRegularHours,
    totalExtraHours,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
  };
};