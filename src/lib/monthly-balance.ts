import { Bill, Customer, Payment, MonthlyBalance } from '@/types';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { getBills, getPayments, getCustomers } from './storage';

export const generateMonthlyBalances = async (customerId: string): Promise<MonthlyBalance[]> => {
  const bills = getBills().filter(b => b.customerId === customerId);
  const payments = getPayments().filter(p => p.customerId === customerId);
  const monthlyBalances: MonthlyBalance[] = [];
  
  // Start from 12 months ago
  for (let i = 12; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const monthEnd = endOfMonth(subMonths(new Date(), i));
    
    const monthBills = bills.filter(bill => {
      const billDate = new Date(bill.date);
      return billDate >= monthStart && billDate <= monthEnd;
    });

    const monthPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return paymentDate >= monthStart && paymentDate <= monthEnd;
    });

    const totalBills = monthBills.reduce((sum, bill) => sum + bill.grandTotal, 0);
    const totalPayments = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate opening balance from previous month's closing balance
    const previousMonth = monthlyBalances[monthlyBalances.length - 1];
    const openingBalance = previousMonth ? previousMonth.closingBalance : 0;

    const balance: MonthlyBalance = {
      month: format(monthStart, 'MMMM'),
      year: monthStart.getFullYear(),
      openingBalance,
      bills: totalBills,
      payments: totalPayments,
      closingBalance: openingBalance + totalBills - totalPayments
    };

    monthlyBalances.push(balance);
  }

  return monthlyBalances;
};

export const getMonthLabel = (monthYear: string): string => {
  const [year, month] = monthYear.split('-');
  return `${month} ${year}`;
};