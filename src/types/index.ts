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