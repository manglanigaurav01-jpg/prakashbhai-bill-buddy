import { Customer, Bill, Payment, CustomerBalance } from '@/types';
import { getCustomers, getBills, getPayments, getAllCustomerBalances, getItems } from './storage';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Define Directory enum locally since it's not exported in this Capacitor version
enum Directory {
  Documents = 'DOCUMENTS',
  Data = 'DATA',
  Cache = 'CACHE',
  External = 'EXTERNAL',
  ExternalStorage = 'EXTERNAL_STORAGE'
}

export interface ComprehensiveBackupData {
  version: string;
  timestamp: string;
  customers: Customer[];
  bills: Bill[];
  payments: Payment[];
  balances: CustomerBalance[];
  items: any[]; // Item master data
  metadata: {
    totalCustomers: number;
    totalBills: number;
    totalPayments: number;
    totalItems: number;
    totalRevenue: number;
    totalPaid: number;
    totalPending: number;
  };
}

export interface BackupResult {
  success: boolean;
  message: string;
  fileName?: string;
  data?: ComprehensiveBackupData;
  error?: any;
}



/**
 * Creates a comprehensive backup of all business data and saves it to the device.
 */
export const createComprehensiveBackup = async (): Promise<BackupResult> => {
  try {
    const backupData = await generateBackupData();
    if (!backupData) {
      return { success: false, message: 'No data to backup.' };
    }

    const jsonString = JSON.stringify(backupData, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `BillBuddy_Comprehensive_Backup_${timestamp}.json`;

    if (Capacitor.isNativePlatform()) {
      return await saveBackupToFile(fileName, jsonString, backupData);
    } else {
      return await downloadBackupForWeb(fileName, jsonString, backupData);
    }
  } catch (error) {
    console.error('Comprehensive backup creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to create backup: ${errorMessage}`, error };
  }
};

/**
 * Shares a backup file.
 */
export const shareBackup = async (fileName: string, data: ComprehensiveBackupData): Promise<BackupResult> => {
  try {
    const jsonString = JSON.stringify(data, null, 2);

    if (Capacitor.isNativePlatform()) {
      const filePath = `BillBuddy_Backups/${fileName}`;
      
      // First, ensure the file exists by writing it again.
      // This is a safeguard in case the file was deleted or the app is sharing a backup that wasn't just created.
      await Filesystem.writeFile({
        path: filePath,
        data: jsonString,
        directory: Directory.Documents,
        recursive: true,
      });

      const file = await Filesystem.getUri({
        directory: Directory.Documents,
        path: filePath,
      });

      await Share.share({
        title: 'Bill Buddy Backup',
        text: `Backup of all business data from Bill Buddy. File: ${fileName}`,
        url: file.uri,
        dialogTitle: 'Share Backup File',
      });
      return { success: true, message: 'Backup shared successfully.' };
    } else {
      // Web Share API can be used here if needed, but for now, we focus on mobile.
      return { success: false, message: 'Share is only available on mobile devices.' };
    }
  } catch (error) {
    console.error('Share backup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to share backup: ${errorMessage}`, error };
  }
};


const generateBackupData = async (): Promise<ComprehensiveBackupData | null> => {
  const customers = getCustomers();
  if (customers.length === 0) return null;

  const allBills = getBills();
  const allPayments = getPayments();
  const balances = getAllCustomerBalances();
  const items = getItems();

  const latestBills = Array.from(
    allBills.reduce((map, bill) => {
      const existing = map.get(bill.id);
      if (!existing || new Date(bill.createdAt) > new Date(existing.createdAt)) {
        map.set(bill.id, bill);
      }
      return map;
    }, new Map<string, Bill>()).values()
  );

  const latestPayments = Array.from(
    allPayments.reduce((map, payment) => {
      const existing = map.get(payment.id);
      if (!existing || new Date(payment.createdAt) > new Date(existing.createdAt)) {
        map.set(payment.id, payment);
      }
      return map;
    }, new Map<string, Payment>()).values()
  );

  const totalRevenue = balances.reduce((sum, b) => sum + b.totalSales, 0);
  const totalPaid = balances.reduce((sum, b) => sum + b.totalPaid, 0);

  return {
    version: '1.1.0', // Incremented version
    timestamp: new Date().toISOString(),
    customers,
    bills: latestBills,
    payments: latestPayments,
    balances,
    items,
    metadata: {
      totalCustomers: customers.length,
      totalBills: latestBills.length,
      totalPayments: latestPayments.length,
      totalItems: items.length,
      totalRevenue,
      totalPaid,
      totalPending: totalRevenue - totalPaid,
    },
  };
};

const saveBackupToFile = async (fileName: string, jsonString: string, data: ComprehensiveBackupData): Promise<BackupResult> => {
  try {
    const path = `BillBuddy_Backups/${fileName}`;
    await Filesystem.writeFile({
      path,
      data: jsonString,
      directory: Directory.Documents,
      recursive: true,
    });
    const platform = Capacitor.getPlatform();
    const directoryName = platform === 'android' ? 'Documents/BillBuddy_Backups' : 'BillBuddy_Backups';
    
    return {
      success: true,
      message: `Backup saved to ${directoryName}`,
      fileName,
      data,
    };
  } catch (error) {
    console.error('Filesystem backup failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Check storage permissions.';
    return {
      success: false,
      message: `Failed to save backup: ${errorMessage}`,
      error,
    };
  }
};

const downloadBackupForWeb = async (fileName: string, jsonString: string, data: ComprehensiveBackupData): Promise<BackupResult> => {
  try {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return {
      success: true,
      message: `Backup downloaded successfully. File: ${fileName}`,
      fileName,
      data,
    };
  } catch (error) {
    console.error('Web backup download error:', error);
    return {
      success: false,
      message: 'Failed to download backup.',
      error,
    };
  }
};

/**
 * Restores data from a comprehensive backup
 */
export const restoreComprehensiveBackup = async (backupContent: string): Promise<BackupResult> => {
  try {
    // Parse the backup content
    const backupData = parseBackupFile(backupContent);
    if (!backupData) {
      return {
        success: false,
        message: 'Backup file is not in a valid JSON format'
      };
    }

    // Validate version compatibility
    if (backupData.version !== '1.0.0') {
      return {
        success: false,
        message: `Incompatible backup version: ${backupData.version}. Expected: 1.0.0`
      };
    }

    // Clear existing data (optional - could add confirmation)
    localStorage.removeItem('prakash_customers');
    localStorage.removeItem('prakash_bills');
    localStorage.removeItem('prakash_payments');
    localStorage.removeItem('prakash_items');

    // Restore data
    localStorage.setItem('prakash_customers', JSON.stringify(backupData.customers));
    localStorage.setItem('prakash_bills', JSON.stringify(backupData.bills));
    localStorage.setItem('prakash_payments', JSON.stringify(backupData.payments));
    if (backupData.items) {
      localStorage.setItem('prakash_items', JSON.stringify(backupData.items));
    }

    // Trigger storage event to update UI
    window.dispatchEvent(new Event('storage'));

    return {
      success: true,
      message: `Successfully restored backup from ${new Date(backupData.timestamp).toLocaleString()}. Restored ${backupData.metadata.totalCustomers} customers, ${backupData.metadata.totalBills} bills, and ${backupData.metadata.totalPayments} payments.`
    };
  } catch (error) {
    console.error('Backup restoration error:', error);
    return {
      success: false,
      message: 'Failed to restore backup data',
      error
    };
  }
};

/**
 * Parses a backup file content and returns the data
 */
export const parseBackupFile = (fileContent: string): ComprehensiveBackupData | null => {
  try {
    const data = JSON.parse(fileContent) as ComprehensiveBackupData;

    // Basic validation
    if (!data.version || !data.timestamp || !Array.isArray(data.customers)) {
      throw new Error('Invalid backup file structure');
    }

    return data;
  } catch (error) {
    console.error('Failed to parse backup file:', error);
    return null;
  }
};

/**
 * Gets backup statistics for display
 */
export const getBackupStatistics = (backupData: ComprehensiveBackupData) => {
  return {
    createdAt: new Date(backupData.timestamp).toLocaleString(),
    version: backupData.version,
    customers: backupData.customers.length,
    bills: backupData.bills.length,
    payments: backupData.payments.length,
    totalItems: backupData.metadata.totalItems,
    totalRevenue: backupData.metadata.totalRevenue,
    totalPaid: backupData.metadata.totalPaid,
    totalPending: backupData.metadata.totalPending
  };
};
