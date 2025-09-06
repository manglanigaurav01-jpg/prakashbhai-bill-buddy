import { Customer, Bill, Payment, CustomerBalance } from '@/types';

const STORAGE_KEYS = {
  CUSTOMERS: 'prakash_customers',
  BILLS: 'prakash_bills',
  PAYMENTS: 'prakash_payments',
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