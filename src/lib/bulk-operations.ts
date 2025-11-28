// Bulk operations for bills, payments, customers, and items

import { Bill } from '@/types';
import { getBills, getPayments, getItems, deleteBill, deletePayment, deleteCustomer, deleteItem } from './storage';

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

// Bulk delete bills
export const bulkDeleteBills = (billIds: string[]): BulkOperationResult => {
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;
  
  billIds.forEach(id => {
    try {
      deleteBill(id);
      processed++;
    } catch (error) {
      failed++;
      errors.push(`Failed to delete bill ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  return {
    success: failed === 0,
    processed,
    failed,
    errors
  };
};

// Bulk delete payments
export const bulkDeletePayments = (paymentIds: string[]): BulkOperationResult => {
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;
  
  paymentIds.forEach(id => {
    try {
      deletePayment(id);
      processed++;
    } catch (error) {
      failed++;
      errors.push(`Failed to delete payment ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  return {
    success: failed === 0,
    processed,
    failed,
    errors
  };
};

// Bulk delete customers
export const bulkDeleteCustomers = (customerIds: string[]): BulkOperationResult => {
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;
  
  // Check for dependencies
  const bills = getBills();
  const payments = getPayments();
  
  customerIds.forEach(id => {
    try {
      // Check if customer has bills or payments
      const hasBills = bills.some(b => b.customerId === id);
      const hasPayments = payments.some(p => p.customerId === id);
      
      if (hasBills || hasPayments) {
        failed++;
        errors.push(`Cannot delete customer ${id}: has associated bills or payments`);
        return;
      }
      
      deleteCustomer(id);
      processed++;
    } catch (error) {
      failed++;
      errors.push(`Failed to delete customer ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  return {
    success: failed === 0,
    processed,
    failed,
    errors
  };
};

// Bulk delete items
export const bulkDeleteItems = (itemIds: string[]): BulkOperationResult => {
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;
  
  // Check for dependencies
  const bills = getBills();
  
  itemIds.forEach(id => {
    try {
      const items = getItems();
      const item = items.find((i: any) => i.id === id);
      if (!item) {
        failed++;
        errors.push(`Item ${id} not found`);
        return;
      }
      
      // Check if item is used in bills
      const isUsed = bills.some(bill => 
        bill.items?.some(billItem => billItem.itemName === item.name)
      );
      
      if (isUsed) {
        failed++;
        errors.push(`Cannot delete item ${item.name}: used in bills`);
        return;
      }
      
      deleteItem(id);
      processed++;
    } catch (error) {
      failed++;
      errors.push(`Failed to delete item ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  return {
    success: failed === 0,
    processed,
    failed,
    errors
  };
};

// Bulk update bills (e.g., change date, customer)
// Note: This is a placeholder - would need updateBill function in storage
export const bulkUpdateBills = (
  billIds: string[],
  _updates: Partial<Bill>
): BulkOperationResult => {
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;
  const bills = getBills();
  
  billIds.forEach(id => {
    try {
      const bill = bills.find(b => b.id === id);
      if (!bill) {
        failed++;
        errors.push(`Bill ${id} not found`);
        return;
      }
      
      // Update bill (would need updateBill function in storage)
      // For now, this is a placeholder
      processed++;
    } catch (error) {
      failed++;
      errors.push(`Failed to update bill ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  return {
    success: failed === 0,
    processed,
    failed,
    errors
  };
};

// Select all helper
export const selectAll = <T extends { id: string }>(items: T[]): string[] => {
  return items.map(item => item.id);
};

// Select none helper
export const selectNone = (): string[] => {
  return [];
};

// Toggle selection helper
export const toggleSelection = (selectedIds: string[], id: string): string[] => {
  if (selectedIds.includes(id)) {
    return selectedIds.filter(selectedId => selectedId !== id);
  }
  return [...selectedIds, id];
};

