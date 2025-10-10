import { Bill, Customer, Payment, ItemMaster } from '@/types';

// Interface for indexes
interface CustomerIndex {
  [customerId: string]: {
    bills: string[];
    payments: string[];
  };
}

interface ItemIndex {
  [itemId: string]: {
    usageInBills: string[];
  };
}

interface DateIndex {
  [date: string]: {
    bills: string[];
    payments: string[];
  };
}

// Global index storage
let customerIndex: CustomerIndex = {};
let itemIndex: ItemIndex = {};
let dateIndex: DateIndex = {};
let isIndexed = false;

// Function to build all indexes
export const buildIndexes = (
  bills: Bill[],
  payments: Payment[],
  customers: Customer[],
  items: ItemMaster[]
) => {
  // Reset indexes
  customerIndex = {};
  itemIndex = {};
  dateIndex = {};

  // Initialize customer index
  customers.forEach(customer => {
    customerIndex[customer.id] = { bills: [], payments: [] };
  });

  // Initialize item index
  items.forEach(item => {
    itemIndex[item.id] = { usageInBills: [] };
  });

  // Index bills
  bills.forEach(bill => {
    // Customer index
    if (!customerIndex[bill.customerId]) {
      customerIndex[bill.customerId] = { bills: [], payments: [] };
    }
    customerIndex[bill.customerId].bills.push(bill.id);

    // Date index
    const billDate = bill.date.split('T')[0];
    if (!dateIndex[billDate]) {
      dateIndex[billDate] = { bills: [], payments: [] };
    }
    dateIndex[billDate].bills.push(bill.id);

    // Item index
    bill.items.forEach(item => {
      if (itemIndex[item.id]) {
        itemIndex[item.id].usageInBills.push(bill.id);
      }
    });
  });

  // Index payments
  payments.forEach(payment => {
    if (!customerIndex[payment.customerId]) {
      customerIndex[payment.customerId] = { bills: [], payments: [] };
    }
    customerIndex[payment.customerId].payments.push(payment.id);

    const paymentDate = payment.date.split('T')[0];
    if (!dateIndex[paymentDate]) {
      dateIndex[paymentDate] = { bills: [], payments: [] };
    }
    dateIndex[paymentDate].payments.push(payment.id);
  });

  isIndexed = true;
};

// Function to get all bills for a customer
export const getCustomerBills = (customerId: string): string[] => {
  return customerIndex[customerId]?.bills || [];
};

// Function to get all payments for a customer
export const getCustomerPayments = (customerId: string): string[] => {
  return customerIndex[customerId]?.payments || [];
};

// Function to get bills by date range
export const getBillsByDateRange = (startDate: string, endDate: string): string[] => {
  const bills: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  Object.entries(dateIndex).forEach(([date, data]) => {
    const currentDate = new Date(date);
    if (currentDate >= start && currentDate <= end) {
      bills.push(...data.bills);
    }
  });

  return bills;
};

// Function to get payments by date range
export const getPaymentsByDateRange = (startDate: string, endDate: string): string[] => {
  const payments: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  Object.entries(dateIndex).forEach(([date, data]) => {
    const currentDate = new Date(date);
    if (currentDate >= start && currentDate <= end) {
      payments.push(...data.payments);
    }
  });

  return payments;
};

// Function to get bills using an item
export const getBillsUsingItem = (itemId: string): string[] => {
  return itemIndex[itemId]?.usageInBills || [];
};

// Function to check if indexes need rebuilding
export const needsReindexing = () => !isIndexed;

// Function to invalidate indexes
export const invalidateIndexes = () => {
  isIndexed = false;
};

// Export the raw indexes for direct access if needed
export const getRawIndexes = () => ({
  customerIndex,
  itemIndex,
  dateIndex
});