import { Bill, Payment, CustomerBalance } from '@/types';

export interface CustomerLifetimeValue {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  totalBills: number;
  totalPayments: number;
  averageBillValue: number;
  paymentRate: number;
  firstBillDate: string;
  lastBillDate: string;
  lifetime: number; // days
}

export interface PaymentCollectionEfficiency {
  totalBilled: number;
  totalCollected: number;
  collectionRate: number;
  averageCollectionTime: number; // days
  onTimePayments: number;
  latePayments: number;
  outstandingAmount: number;
}

export interface ItemProfitability {
  itemName: string;
  totalQuantity: number;
  totalRevenue: number;
  numberOfBills: number;
  averagePrice: number;
  revenueContribution: number; // percentage
  growthRate: number; // percentage
}

export interface ComparisonReport {
  period: string;
  currentRevenue: number;
  previousRevenue: number;
  growth: number;
  growthPercentage: number;
  currentBills: number;
  previousBills: number;
  currentPayments: number;
  previousPayments: number;
}

export const calculateCustomerLifetimeValue = (
  bills: Bill[],
  payments: Payment[],
  customers: CustomerBalance[]
): CustomerLifetimeValue[] => {
  const clvMap = new Map<string, CustomerLifetimeValue>();

  customers.forEach(customer => {
    const customerBills = bills.filter(b => b.customerId === customer.customerId);
    const customerPayments = payments.filter(p => p.customerId === customer.customerId);

    if (customerBills.length === 0) return;

    const sortedBills = customerBills.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstBillDate = sortedBills[0].date;
    const lastBillDate = sortedBills[sortedBills.length - 1].date;
    const lifetime = Math.max(1, 
      Math.floor((new Date(lastBillDate).getTime() - new Date(firstBillDate).getTime()) / (1000 * 60 * 60 * 24))
    );

    const totalRevenue = customerBills.reduce((sum, bill) => sum + bill.grandTotal, 0);
    const totalPaymentsAmount = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);

    clvMap.set(customer.customerId, {
      customerId: customer.customerId,
      customerName: customer.customerName,
      totalRevenue,
      totalBills: customerBills.length,
      totalPayments: customerPayments.length,
      averageBillValue: totalRevenue / customerBills.length,
      paymentRate: totalRevenue > 0 ? (totalPaymentsAmount / totalRevenue) * 100 : 0,
      firstBillDate,
      lastBillDate,
      lifetime,
    });
  });

  return Array.from(clvMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
};

export const calculatePaymentCollectionEfficiency = (
  bills: Bill[],
  payments: Payment[]
): PaymentCollectionEfficiency => {
  const totalBilled = bills.reduce((sum, bill) => sum + bill.grandTotal, 0);
  const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

  // Calculate average collection time (simplified)
  let totalCollectionDays = 0;
  let collectionCount = 0;

  bills.forEach(bill => {
    const billPayments = payments.filter(p => 
      p.customerId === bill.customerId && 
      new Date(p.date) >= new Date(bill.date)
    );
    
    if (billPayments.length > 0) {
      const firstPayment = billPayments.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )[0];
      
      const days = Math.floor(
        (new Date(firstPayment.date).getTime() - new Date(bill.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      totalCollectionDays += days;
      collectionCount++;
    }
  });

  const averageCollectionTime = collectionCount > 0 ? totalCollectionDays / collectionCount : 0;
  const onTimePayments = payments.filter(p => {
    const bill = bills.find(b => b.customerId === p.customerId);
    if (!bill) return false;
    const days = Math.floor(
      (new Date(p.date).getTime() - new Date(bill.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days <= 7; // Consider on-time if paid within 7 days
  }).length;

  return {
    totalBilled,
    totalCollected,
    collectionRate,
    averageCollectionTime,
    onTimePayments,
    latePayments: payments.length - onTimePayments,
    outstandingAmount: totalBilled - totalCollected,
  };
};

export const calculateItemProfitability = (bills: Bill[]): ItemProfitability[] => {
  const itemMap = new Map<string, {
    quantity: number;
    revenue: number;
    billCount: number;
    prices: number[];
  }>();

  const totalRevenue = bills.reduce((sum, bill) => sum + bill.grandTotal, 0);

  bills.forEach(bill => {
    bill.items.forEach(item => {
      const existing = itemMap.get(item.itemName) || {
        quantity: 0,
        revenue: 0,
        billCount: 0,
        prices: [],
      };

      existing.quantity += item.quantity;
      existing.revenue += item.total;
      existing.billCount += 1;
      existing.prices.push(item.rate);

      itemMap.set(item.itemName, existing);
    });
  });

  const items: ItemProfitability[] = Array.from(itemMap.entries()).map(([name, data]) => ({
    itemName: name,
    totalQuantity: data.quantity,
    totalRevenue: data.revenue,
    numberOfBills: data.billCount,
    averagePrice: data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
    revenueContribution: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    growthRate: 0, // Would need historical data for accurate calculation
  }));

  return items.sort((a, b) => b.totalRevenue - a.totalRevenue);
};

export const generateComparisonReport = (
  bills: Bill[],
  payments: Payment[],
  periodType: 'month' | 'year'
): ComparisonReport => {
  const now = new Date();
  const currentStart = new Date(now);
  const previousStart = new Date(now);

  if (periodType === 'month') {
    currentStart.setDate(1);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setMonth(previousStart.getMonth() - 1);
    previousStart.setDate(1);
    previousStart.setHours(0, 0, 0, 0);
  } else {
    currentStart.setMonth(0, 1);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setFullYear(previousStart.getFullYear() - 1);
    previousStart.setMonth(0, 1);
    previousStart.setHours(0, 0, 0, 0);
  }

  const currentEnd = new Date(now);
  const previousEnd = new Date(currentStart);
  previousEnd.setMilliseconds(-1);

  const currentBills = bills.filter(b => {
    const date = new Date(b.date);
    return date >= currentStart && date <= currentEnd;
  });

  const previousBills = bills.filter(b => {
    const date = new Date(b.date);
    return date >= previousStart && date < currentStart;
  });

  const currentPayments = payments.filter(p => {
    const date = new Date(p.date);
    return date >= currentStart && date <= currentEnd;
  });

  const previousPayments = payments.filter(p => {
    const date = new Date(p.date);
    return date >= previousStart && date < currentStart;
  });

  const currentRevenue = currentBills.reduce((sum, b) => sum + b.grandTotal, 0);
  const previousRevenue = previousBills.reduce((sum, b) => sum + b.grandTotal, 0);
  const growth = currentRevenue - previousRevenue;
  const growthPercentage = previousRevenue > 0 ? (growth / previousRevenue) * 100 : 0;

  return {
    period: periodType === 'month' ? 'This Month vs Last Month' : 'This Year vs Last Year',
    currentRevenue,
    previousRevenue,
    growth,
    growthPercentage,
    currentBills: currentBills.length,
    previousBills: previousBills.length,
    currentPayments: currentPayments.length,
    previousPayments: previousPayments.length,
  };
};
