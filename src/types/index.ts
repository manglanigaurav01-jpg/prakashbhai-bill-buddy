
export interface Customer {
  id: string;
  name: string;
  phone?: string;
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
  discount?: number;
  discountType?: 'percentage' | 'flat';
  grandTotal: number;
  status?: 'paid' | 'partial' | 'unpaid';
  createdAt: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  paymentMethod?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
  createdAt: string;
}

export interface MonthlyBalance {
  month: string;
  year: number;
  openingBalance: number;
  bills: number;
  payments: number;
  closingBalance: number;
}

export interface CustomerBalance {
  customerId: string;
  customerName: string;
  totalSales: number;
  totalPaid: number;
  pending: number;
  monthlyBalances?: MonthlyBalance[];
  lastMonthBalance?: number;
}

export interface Customer {
  id: string;
  name: string;
  createdAt: string;
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

 