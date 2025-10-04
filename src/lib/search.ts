import { Bill, Payment, Customer, ItemMaster } from '@/types';

export interface SearchFilters {
  query?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: 'paid' | 'partial' | 'unpaid' | 'all';
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
}

export const searchBills = (bills: Bill[], filters: SearchFilters): Bill[] => {
  return bills.filter(bill => {
    // Text search
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const matchesText = 
        bill.customerName.toLowerCase().includes(q) ||
        bill.particulars.toLowerCase().includes(q) ||
        bill.items.some(item => item.itemName.toLowerCase().includes(q));
      if (!matchesText) return false;
    }

    // Date range
    const billDate = new Date(bill.date);
    if (filters.dateFrom && billDate < filters.dateFrom) return false;
    if (filters.dateTo && billDate > filters.dateTo) return false;

    // Status
    if (filters.status && filters.status !== 'all' && bill.status !== filters.status) {
      return false;
    }

    // Amount range
    if (filters.minAmount && bill.grandTotal < filters.minAmount) return false;
    if (filters.maxAmount && bill.grandTotal > filters.maxAmount) return false;

    return true;
  });
};

export const searchPayments = (payments: Payment[], filters: SearchFilters): Payment[] => {
  return payments.filter(payment => {
    // Text search
    if (filters.query) {
      const q = filters.query.toLowerCase();
      if (!payment.customerName.toLowerCase().includes(q)) return false;
    }

    // Date range
    const paymentDate = new Date(payment.date);
    if (filters.dateFrom && paymentDate < filters.dateFrom) return false;
    if (filters.dateTo && paymentDate > filters.dateTo) return false;

    // Amount range
    if (filters.minAmount && payment.amount < filters.minAmount) return false;
    if (filters.maxAmount && payment.amount > filters.maxAmount) return false;

    // Payment method
    if (filters.paymentMethod && filters.paymentMethod !== 'all' && payment.paymentMethod !== filters.paymentMethod) {
      return false;
    }

    return true;
  });
};

export const searchCustomers = (customers: Customer[], query: string): Customer[] => {
  if (!query) return customers;
  const q = query.toLowerCase();
  return customers.filter(customer => 
    customer.name.toLowerCase().includes(q) ||
    (customer.phone && customer.phone.includes(q))
  );
};

export const globalSearch = (
  query: string,
  bills: Bill[],
  payments: Payment[],
  customers: Customer[],
  items: ItemMaster[]
) => {
  const q = query.toLowerCase();
  
  return {
    bills: bills.filter(b => 
      b.customerName.toLowerCase().includes(q) ||
      b.particulars.toLowerCase().includes(q) ||
      b.items.some(item => item.itemName.toLowerCase().includes(q))
    ),
    payments: payments.filter(p => 
      p.customerName.toLowerCase().includes(q)
    ),
    customers: customers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    ),
    items: items.filter(i => 
      i.name.toLowerCase().includes(q)
    )
  };
};
