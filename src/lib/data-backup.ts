import { Filesystem, Directory } from '@capacitor/filesystem';
import { Bill, Customer, Payment, ItemMaster } from '@/types';
import { getCustomers, getBills, getPayments, getItems } from './storage';
import { checkDataConsistency, DataValidationResult } from './validation';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Constants
const BACKUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MAX_LOCAL_BACKUPS = 5;

// Type for backup metadata
interface BackupMetadata {
  timestamp: string;
  checksum: string;
  recordCounts: {
    customers: number;
    bills: number;
    payments: number;
    items: number;
  };
}

// Function to calculate checksum of data
const calculateChecksum = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

// Function to create backup
export const createLocalBackup = async () => {
  try {
    // Get all data
    const customers = getCustomers();
    const bills = getBills();
    const payments = getPayments();
    const items = getItems();

    // Create backup object
    const backup = {
      customers,
      bills,
      payments,
      items,
      timestamp: new Date().toISOString()
    };

    // Convert to string and calculate checksum
    const backupString = JSON.stringify(backup);
    const checksum = calculateChecksum(backupString);

    // Create metadata
    const metadata: BackupMetadata = {
      timestamp: backup.timestamp,
      checksum,
      recordCounts: {
        customers: customers.length,
        bills: bills.length,
        payments: payments.length,
        items: items.length
      }
    };

    // Save backup
    const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await Filesystem.writeFile({
      path: fileName,
      data: backupString,
      directory: Directory.Data,
      recursive: true
    });

    // Save metadata
    await Filesystem.writeFile({
      path: `${fileName}.meta`,
      data: JSON.stringify(metadata),
      directory: Directory.Data
    });

    // Clean up old backups
    await cleanupOldBackups();

    return { success: true, message: 'Backup created successfully' };
  } catch (error) {
    console.error('Backup creation failed:', error);
    return { success: false, message: 'Failed to create backup' };
  }
};

// Function to clean up old backups
const cleanupOldBackups = async () => {
  try {
    const result = await Filesystem.readdir({
      path: '',
      directory: Directory.Data
    });

    const backups = result.files
      .filter(f => f.name.startsWith('backup_') && f.name.endsWith('.json'))
      .sort((a, b) => (new Date(b.mtime!).getTime() - new Date(a.mtime!).getTime()));

    // Keep only the most recent backups
    for (let i = MAX_LOCAL_BACKUPS; i < backups.length; i++) {
      await Filesystem.deleteFile({
        path: backups[i].name,
        directory: Directory.Data
      });
      await Filesystem.deleteFile({
        path: `${backups[i].name}.meta`,
        directory: Directory.Data
      });
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
};

// Function to restore from backup
export const restoreFromBackup = async (backupFile: string) => {
  try {
    // Read backup and metadata
    const backupContent = await Filesystem.readFile({
      path: backupFile,
      directory: Directory.Data
    });

    const metadataContent = await Filesystem.readFile({
      path: `${backupFile}.meta`,
      directory: Directory.Data
    });

    const backup = JSON.parse(typeof backupContent.data === 'string' ? backupContent.data : await backupContent.data.text());
    const metadata: BackupMetadata = JSON.parse(typeof metadataContent.data === 'string' ? metadataContent.data : await metadataContent.data.text());

    // Verify checksum
    const currentChecksum = calculateChecksum(JSON.stringify(backup));
    if (currentChecksum !== metadata.checksum) {
      throw new Error('Backup file is corrupted');
    }

    // Verify data consistency
    const consistency = checkDataConsistency(backup);
    if (!consistency.isConsistent) {
      throw new Error(`Data consistency check failed: ${consistency.errors.join(', ')}`);
    }

    // Store the data
    localStorage.setItem('prakash_customers', JSON.stringify(backup.customers));
    localStorage.setItem('prakash_bills', JSON.stringify(backup.bills));
    localStorage.setItem('prakash_payments', JSON.stringify(backup.payments));
    localStorage.setItem('prakash_items', JSON.stringify(backup.items));

    return { success: true, message: 'Restore completed successfully' };
  } catch (error) {
    console.error('Restore failed:', error);
    return { success: false, message: `Failed to restore: ${error.message}` };
  }
};

// Function to start automatic backup
export const startAutomaticBackup = () => {
  setInterval(async () => {
    const result = await createLocalBackup();
    if (!result.success) {
      console.error('Automatic backup failed:', result.message);
    }
  }, BACKUP_INTERVAL);
};

// Function to list available backups
export const listAvailableBackups = async () => {
  try {
    const result = await Filesystem.readdir({
      path: '',
      directory: Directory.Data
    });

    const backups = await Promise.all(
      result.files
        .filter(f => f.name.startsWith('backup_') && f.name.endsWith('.json'))
        .sort((a, b) => (new Date(b.mtime!).getTime() - new Date(a.mtime!).getTime()))
        .map(async (file) => {
          const metadataContent = await Filesystem.readFile({
            path: `${file.name}.meta`,
            directory: Directory.Data
          });
          return {
            fileName: file.name,
            metadata: JSON.parse(typeof metadataContent.data === 'string' ? metadataContent.data : await metadataContent.data.text()) as BackupMetadata
          };
        })
    );

    return { success: true, backups };
  } catch (error) {
    console.error('Failed to list backups:', error);
    return { success: false, message: 'Failed to list backups' };
  }
};