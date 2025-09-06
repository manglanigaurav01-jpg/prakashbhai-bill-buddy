export interface Customer {
  id: string;
  name: string;
  createdAt: string;
}

export interface BillItem {
  id: string;
  itemName: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface Bill {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  particulars: string;
  items: BillItem[];
  grandTotal: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  createdAt: string;
}

export interface CustomerBalance {
  customerId: string;
  customerName: string;
  totalSales: number;
  totalPaid: number;
  pending: number;
}

export interface ItemMaster {
  id: string;
  name: string;
  type: 'fixed' | 'variable';
  rate?: number; // Only for fixed-price items
  createdAt: string;
  updatedAt: string;
}

export interface ItemRateHistory {
  id: string;
  itemId: string;
  oldRate: number;
  newRate: number;
  changedAt: string;
}

export interface ItemUsage {
  itemId: string;
  itemName: string;
  usageCount: number;
  totalQuantity: number;
  totalRevenue: number;
}

export interface Staff {
  id: string;
  name: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  status: 'present' | 'absent';
  regularHours: number; // in hours (e.g., 8.5 for 8 hours 30 minutes)
  extraHours: number; // overtime hours
  createdAt: string;
}