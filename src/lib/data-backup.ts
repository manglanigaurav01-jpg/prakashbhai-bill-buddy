import { Customer, Bill, Payment, ItemMaster } from '@/types';

export interface LocalBackupResult {
  success: boolean;
  message: string;
  timestamp?: string;
  error?: any;
}

/**
 * Creates a local backup of all business data in localStorage
 */
export const createLocalBackup = (): LocalBackupResult => {
  try {
    // Get all data from localStorage
    const customers = JSON.parse(localStorage.getItem('prakash_customers') || '[]') as Customer[];
    const bills = JSON.parse(localStorage.getItem('prakash_bills') || '[]') as Bill[];
    const payments = JSON.parse(localStorage.getItem('prakash_payments') || '[]') as Payment[];
    const items = JSON.parse(localStorage.getItem('prakash_items') || '[]') as ItemMaster[];

    // Create backup data structure
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      customers,
      bills,
      payments,
      items,
      metadata: {
        totalCustomers: customers.length,
        totalBills: bills.length,
        totalPayments: payments.length,
        totalItems: items.length
      }
    };

    // Store backup in localStorage with timestamp
    const backupKey = `prakash_backup_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(backupData));

    // Keep only last 5 backups to prevent storage bloat
    const backupKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('prakash_backup_'))
      .sort()
      .reverse();

    if (backupKeys.length > 5) {
      backupKeys.slice(5).forEach(key => localStorage.removeItem(key));
    }

    return {
      success: true,
      message: 'Local backup created successfully',
      timestamp: backupData.timestamp
    };
  } catch (error) {
    console.error('Local backup creation error:', error);
    return {
      success: false,
      message: 'Failed to create local backup',
      error
    };
  }
};

/**
 * Restores data from a local backup
 */
export const restoreLocalBackup = (backupKey: string): LocalBackupResult => {
  try {
    const backupData = JSON.parse(localStorage.getItem(backupKey) || '{}');

    if (!backupData.customers || !backupData.timestamp) {
      return {
        success: false,
        message: 'Invalid backup data'
      };
    }

    // Restore data to localStorage
    localStorage.setItem('prakash_customers', JSON.stringify(backupData.customers));
    localStorage.setItem('prakash_bills', JSON.stringify(backupData.bills || []));
    localStorage.setItem('prakash_payments', JSON.stringify(backupData.payments || []));
    localStorage.setItem('prakash_items', JSON.stringify(backupData.items || []));

    // Trigger storage event to update UI
    window.dispatchEvent(new Event('storage'));

    return {
      success: true,
      message: `Successfully restored backup from ${new Date(backupData.timestamp).toLocaleString()}`
    };
  } catch (error) {
    console.error('Local backup restoration error:', error);
    return {
      success: false,
      message: 'Failed to restore local backup',
      error
    };
  }
};

/**
 * Gets list of available local backups
 */
export const getLocalBackups = () => {
  return Object.keys(localStorage)
    .filter(key => key.startsWith('prakash_backup_'))
    .map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return {
          key,
          timestamp: data.timestamp,
          metadata: data.metadata
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime());
};
