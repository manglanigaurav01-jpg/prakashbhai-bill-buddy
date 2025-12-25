import { Customer, Bill, Payment, CustomerBalance } from '@/types';
import { getCustomers, getBills, getPayments, getAllCustomerBalances, getItems } from './storage';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { checkStoragePermissions } from './permissions';

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
 * Request storage permissions on mobile devices
 * For Capacitor v8, permissions are handled through native platform settings
 */
const requestStoragePermissions = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return true; // Web doesn't need permissions
  }

  try {
    // For Capacitor v8, we can't programmatically request permissions
    // We need to guide users to enable them manually in device settings
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
      // On Android 11+, MANAGE_EXTERNAL_STORAGE must be granted manually in settings
      console.log('Android detected - storage permissions must be granted manually in device settings');
      return true; // We'll attempt the operation and handle errors gracefully
    } else if (platform === 'ios') {
      // iOS handles permissions through the app's plist configuration
      console.log('iOS detected - permissions handled through app configuration');
      return true;
    }

    return true;
  } catch (error) {
    console.error('Error checking platform for permissions:', error);
    return true; // Fallback: try to proceed anyway
  }
};

/**
 * Creates a comprehensive backup containing all business data
 * - Customer names
 * - All bills (latest edited versions only)
 * - All payments (latest edited versions only)
 * - Last balance of all customers
 */
export const createComprehensiveBackup = async (): Promise<BackupResult> => {
  try {
    // Get all data from storage
    const customers = getCustomers();
    const allBills = getBills();
    const allPayments = getPayments();
    const balances = getAllCustomerBalances();
    const items = getItems();

    if (customers.length === 0) {
      return {
        success: false,
        message: 'No customers found to backup',
        error: 'NO_CUSTOMERS'
      };
    }

    // Group bills and payments by customer to get latest versions
    const latestBillsMap = new Map<string, Bill>();
    const latestPaymentsMap = new Map<string, Payment>();

    // Process bills - keep only the latest edited version for each bill ID
    allBills.forEach(bill => {
      const existing = latestBillsMap.get(bill.id);
      if (!existing || new Date(bill.createdAt) > new Date(existing.createdAt)) {
        latestBillsMap.set(bill.id, bill);
      }
    });

    // Process payments - keep only the latest edited version for each payment ID
    allPayments.forEach(payment => {
      const existing = latestPaymentsMap.get(payment.id);
      if (!existing || new Date(payment.createdAt) > new Date(existing.createdAt)) {
        latestPaymentsMap.set(payment.id, payment);
      }
    });

    const latestBills = Array.from(latestBillsMap.values());
    const latestPayments = Array.from(latestPaymentsMap.values());

    // Calculate totals for metadata
    const totalRevenue = balances.reduce((sum, balance) => sum + balance.totalSales, 0);
    const totalPaid = balances.reduce((sum, balance) => sum + balance.totalPaid, 0);
    const totalPending = balances.reduce((sum, balance) => sum + balance.pending, 0);

    // Create backup data structure
    const backupData: ComprehensiveBackupData = {
      version: '1.0.0',
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
        totalPending
      }
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `BillBuddy_Comprehensive_Backup_${timestamp}.json`;

    // Convert to JSON string
    const jsonString = JSON.stringify(backupData, null, 2);

    if (Capacitor.isNativePlatform()) {
      // Mobile: Save to device storage and share
      try {
        // Request storage permissions (will always return true for Capacitor v8)
        await requestStoragePermissions();
        // Ensure the backup directory exists
        const backupDir = 'BillBuddy_Backups';
        const storageDirectory = Capacitor.getPlatform() === 'android' ? 'EXTERNAL' as Directory : 'DOCUMENTS' as Directory;

        try {
          await Filesystem.mkdir({
            path: backupDir,
            directory: storageDirectory,
            recursive: true
          });
        } catch (mkdirError) {
          // Directory might already exist, continue
          console.log('Backup directory creation attempted:', mkdirError);
        }

        const fullPath = `${backupDir}/${fileName}`;

        const result = await Filesystem.writeFile({
          path: fullPath,
          data: jsonString, // Pass JSON string directly for text data
          directory: storageDirectory
        });

        // Share the file
        await Share.share({
          title: 'Bill Buddy Backup',
          text: 'Comprehensive backup of all business data',
          url: result.uri,
          dialogTitle: 'Share Backup File'
        });

        return {
          success: true,
          message: `Backup created and shared successfully. File: ${fileName}`,
          fileName,
          data: backupData
        };
      } catch (mobileError) {
        console.error('Mobile backup error:', mobileError);

        // Try fallback to CACHE directory if DOCUMENTS fails
        try {
          console.log('Attempting fallback to CACHE directory...');
          const result = await Filesystem.writeFile({
            path: fileName,
            data: jsonString, // Pass JSON string directly for text data
            directory: 'CACHE' as Directory
          });

          await Share.share({
            title: 'Bill Buddy Backup',
            text: 'Comprehensive backup of all business data',
            url: result.uri,
            dialogTitle: 'Share Backup File'
          });

          return {
            success: true,
            message: `Backup created and shared successfully (using cache). File: ${fileName}`,
            fileName,
            data: backupData
          };
        } catch (fallbackError) {
          console.error('Fallback backup also failed:', fallbackError);
          return {
            success: false,
            message: 'Failed to save backup on mobile device. Please check storage permissions.',
            error: mobileError
          };
        }
      }
    } else {
      // Web: Trigger download
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
          data: backupData
        };
      } catch (webError) {
        console.error('Web backup error:', webError);
        return {
          success: false,
          message: 'Failed to download backup file',
          error: webError
        };
      }
    }
  } catch (error) {
    console.error('Comprehensive backup creation error:', error);
    return {
      success: false,
      message: 'Failed to create comprehensive backup',
      error
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
