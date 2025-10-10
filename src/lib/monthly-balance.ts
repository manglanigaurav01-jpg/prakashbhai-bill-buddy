import { Bill, Customer, Payment } from '@/types';

interface MonthlyBalance {
  customerId: string;
  customerName: string;
  month: string; // YYYY-MM format
  openingBalance: number;
  closingBalance: number;
  totalBills: number;
  totalPayments: number;
}

export const generateMonthlyBalances = (bills: Bill[], payments: Payment[], customers: Customer[]) => {
  const monthlyBalances: { [key: string]: MonthlyBalance[] } = {};
  
  // Group bills and payments by month
  bills.forEach(bill => {
    const month = bill.date.substring(0, 7); // YYYY-MM
    if (!monthlyBalances[month]) {
      monthlyBalances[month] = customers.map(customer => ({
        customerId: customer.id,
        customerName: customer.name,
        month,
        openingBalance: 0,
        closingBalance: 0,
        totalBills: 0,
        totalPayments: 0
      }));
    }
    
    const customerBalance = monthlyBalances[month].find(b => b.customerId === bill.customerId);
    if (customerBalance) {
      customerBalance.totalBills += bill.grandTotal;
    }
  });

  payments.forEach(payment => {
    const month = payment.date.substring(0, 7); // YYYY-MM
    if (!monthlyBalances[month]) {
      monthlyBalances[month] = customers.map(customer => ({
        customerId: customer.id,
        customerName: customer.name,
        month,
        openingBalance: 0,
        closingBalance: 0,
        totalBills: 0,
        totalPayments: 0
      }));
    }
    
    const customerBalance = monthlyBalances[month].find(b => b.customerId === payment.customerId);
    if (customerBalance) {
      customerBalance.totalPayments += payment.amount;
    }
  });

  // Sort months chronologically
  const sortedMonths = Object.keys(monthlyBalances).sort();
  
  // Calculate opening and closing balances
  sortedMonths.forEach((month, index) => {
    monthlyBalances[month].forEach(balance => {
      if (index === 0) {
        balance.openingBalance = 0; // First month starts with 0
      } else {
        const prevMonth = sortedMonths[index - 1];
        const prevBalance = monthlyBalances[prevMonth].find(b => b.customerId === balance.customerId);
        balance.openingBalance = prevBalance ? prevBalance.closingBalance : 0;
      }
      
      balance.closingBalance = balance.openingBalance + balance.totalBills - balance.totalPayments;
    });
  });

  return monthlyBalances;
};

export const getMonthLabel = (month: string) => {
  const date = new Date(month + '-01');
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};