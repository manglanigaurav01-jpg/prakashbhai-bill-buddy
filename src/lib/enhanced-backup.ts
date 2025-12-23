import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Bill, Customer, Payment, ItemMaster, ItemRateHistory } from '@/types';
import { 
  getCustomers, 
  getBills, 
  getPayments, 
  getItems, 
  getRateHistory, 
  getBusinessAnalytics
} from './storage';

// Filesystem directory constants
const DATA_DIR = 'DATA';
const BACKUP_FOLDER = 'BillBuddyBackups';
import { format } from 'date-fns';
import pako from 'pako';

// Web platform backup storage key prefix
const WEB_BACKUP_PREFIX = 'prakash_web_backup_';

// Constants
const MAX_LOCAL_BACKUPS = 5;

// Enhanced backup data structure
interface EnhancedBackupData {
  version: string;
  timestamp: string;
  data: {
    customers: Customer[];
    bills: Bill[];
    payments: Payment[];
    items: ItemMaster[];
    itemRateHistory: ItemRateHistory[];
    businessAnalytics: any;
  };
  metadata: {
    checksum: string;
    counts: {
      customers: number;
      bills: number;
      payments: number;
      items: number;
      itemRateHistory: number;
    };
    totalAmount: {
      billed: number;
      paid: number;
      outstanding: number;
    };
    dateRange: {
      firstBill: string;
      lastBill: string;
      firstPayment: string;
      lastPayment: string;
    };
  };
}

// Function to calculate checksum
const calculateChecksum = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
};

// Function to strip BOM and trim
const stripBomAndTrim = (s: string) => s.replace(/^\uFEFF/, '').trim();

// Function to get all data with validation
const getAllData = () => {
  const customers = getCustomers();
  const bills = getBills();
  const payments = getPayments();
  const items = getItems();
  const itemRateHistory = getRateHistory();
  const businessAnalytics = getBusinessAnalytics();

  // Validate data relationships
  const customerIds = new Set(customers.map(c => c.id));

  // Validate bills have valid customer references
  const validBills = bills.filter(bill => customerIds.has(bill.customerId));
  if (validBills.length !== bills.length) {
    console.warn(`Found ${bills.length - validBills.length} bills with invalid customer references`);
  }

  // Validate payments have valid customer references
  const validPayments = payments.filter(payment => customerIds.has(payment.customerId));
  if (validPayments.length !== payments.length) {
    console.warn(`Found ${payments.length - validPayments.length} payments with invalid customer references`);
  }

  return {
    customers,
    validBills,
    validPayments,
    items,
    itemRateHistory,
    businessAnalytics
  };
};

// Function to calculate metadata
const calculateMetadata = (data: ReturnType<typeof getAllData>) => {
  const totalBilled = data.validBills.reduce((sum, bill) => sum + bill.grandTotal, 0);
  const totalPaid = data.validPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  const billDates = data.validBills.map(b => new Date(b.date));
  const paymentDates = data.validPayments.map(p => new Date(p.date));
  
  return {
    counts: {
      customers: data.customers.length,
      bills: data.validBills.length,
      payments: data.validPayments.length,
      items: data.items.length,
      itemRateHistory: data.itemRateHistory.length
    },
    totalAmount: {
      billed: totalBilled,
      paid: totalPaid,
      outstanding: totalBilled - totalPaid
    },
    dateRange: {
      firstBill: billDates.length ? format(new Date(Math.min(...billDates.map(d => d.getTime()))), 'yyyy-MM-dd') : '',
      lastBill: billDates.length ? format(new Date(Math.max(...billDates.map(d => d.getTime()))), 'yyyy-MM-dd') : '',
      firstPayment: paymentDates.length ? format(new Date(Math.min(...paymentDates.map(d => d.getTime()))), 'yyyy-MM-dd') : '',
      lastPayment: paymentDates.length ? format(new Date(Math.max(...paymentDates.map(d => d.getTime()))), 'yyyy-MM-dd') : ''
    }
  };
};

// Enhanced backup creation function
export const createEnhancedBackup = async () => {
  try {
    // Get and validate all data
    const allData = getAllData();
    
    // Create backup object with all data
    const backup: EnhancedBackupData = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      data: {
        customers: allData.customers,
        bills: allData.validBills,
        payments: allData.validPayments,
        items: allData.items,
        itemRateHistory: allData.itemRateHistory,
        businessAnalytics: allData.businessAnalytics
      },
      metadata: {
        checksum: '',
        ...calculateMetadata(allData)
      }
    };

    // Calculate checksum after preparing the data
    const backupString = JSON.stringify(backup.data);
    backup.metadata.checksum = calculateChecksum(backupString);

    const fileName = `enhanced_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
    const backupJson = JSON.stringify(backup);
    let uri: string | undefined;

    // Handle web platform differently
    const isWeb = Capacitor.getPlatform() === 'web';
    
    if (isWeb) {
      // For web platform, store in localStorage and create download blob
      try {
        const storageKey = `${WEB_BACKUP_PREFIX}${fileName}`;
        localStorage.setItem(storageKey, backupJson);
        
        // Create blob URL for download
        const blob = new Blob([backupJson], { type: 'application/json' });
        uri = URL.createObjectURL(blob);
        
        // Trigger download
        const link = document.createElement('a');
        link.href = uri;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up old web backups
          cleanupOldBackups();
      } catch (webError) {
        console.error('Web backup storage failed:', webError);
        // Still try to provide download even if localStorage fails
        try {
          const blob = new Blob([backupJson], { type: 'application/json' });
          uri = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = uri;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (downloadError) {
          throw new Error(`Failed to create backup: ${webError instanceof Error ? webError.message : String(webError)}`);
        }
      }
    } else {
      // For mobile platforms, save to DOCUMENTS directory and share it
      try {
        // Save to DOCUMENTS directory inside a dedicated folder (visible in file manager)
        const timestamp = new Date().getTime();
        const uniqueFileName = `backup_${timestamp}_${fileName}`;
        const documentsPath = `${BACKUP_FOLDER}/${uniqueFileName}`;

        // Ensure the backup folder exists in Documents before writing
        try {
          await Filesystem.mkdir({
            path: BACKUP_FOLDER,
            directory: 'DOCUMENTS' as Directory,
            recursive: true
          });
        } catch (mkdirErr) {
          // Ignore if folder already exists or creation is not supported on platform
          console.warn('Could not create backup folder in Documents, continuing:', mkdirErr);
        }

        // Convert JSON string to base64 for Filesystem API
        const base64Data = btoa(unescape(encodeURIComponent(backupJson)));

        // Primary attempt: write to Documents and share that file
        let wroteToDocuments = false;
        try {
          await Filesystem.writeFile({
            path: documentsPath,
            data: base64Data,
            directory: 'DOCUMENTS' as Directory
          });
          wroteToDocuments = true;
        } catch (writeErr) {
          console.warn('Failed to write backup to Documents:', writeErr);
          wroteToDocuments = false;
        }

        // Always persist a copy into app data for restore listing (use plain JSON)
        try {
          await Filesystem.writeFile({
            path: fileName,
            data: backupJson,
            directory: DATA_DIR
          });
        } catch (dataWriteErr) {
          console.warn('Failed to write backup to DATA directory (non-fatal):', dataWriteErr);
        }

        // Try to get a URI to share. Prefer the documents file if we wrote it, otherwise fall back to DATA_DIR file
        let fileInfo: any | undefined;
        if (wroteToDocuments) {
          try {
            fileInfo = await Filesystem.getUri({ path: documentsPath, directory: 'DOCUMENTS' as Directory });
          } catch (getUriErr) {
            console.warn('Could not get URI for Documents file, will try DATA_DIR file:', getUriErr);
            fileInfo = undefined;
          }
        }

        if (!fileInfo) {
          try {
            fileInfo = await Filesystem.getUri({ path: fileName, directory: DATA_DIR });
          } catch (getUriErr) {
            console.warn('Could not get URI for DATA_DIR file:', getUriErr);
            fileInfo = undefined;
          }
        }

        if (!fileInfo || !fileInfo.uri) {
          // As a last resort, attempt to create a temporary file in DOCUMENTS with plain JSON (some platforms prefer non-base64)
          try {
            const fallbackPath = `${BACKUP_FOLDER}/fallback_${uniqueFileName}`;
            await Filesystem.writeFile({ path: fallbackPath, data: backupJson, directory: 'DOCUMENTS' as Directory });
            const info = await Filesystem.getUri({ path: fallbackPath, directory: 'DOCUMENTS' as Directory });
            if (info && info.uri) {
              fileInfo = info;
            }
          } catch (fallbackErr) {
            console.warn('Fallback write to Documents failed:', fallbackErr);
            fileInfo = undefined;
          }
        }

        if (!fileInfo || !fileInfo.uri) {
          // If we still don't have a shareable URI, fail gracefully but keep the DATA_DIR copy online for restores
          throw new Error('Could not get a shareable URI for the backup file on this device. A local copy was saved for restore within the app.');
        }

        // Share the backup file (forces user to save it to an accessible location)
        try {
          await Share.share({
            title: 'Bill Buddy Backup',
            text: `Backup file created on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
            url: fileInfo.uri,
            dialogTitle: 'Share Backup File'
          });
          uri = fileInfo.uri;
        } catch (shareErr) {
          // Sharing may fail on some devices; log and surface a helpful message
          console.warn('Sharing backup file failed:', shareErr);
          throw new Error(`Sharing failed: ${shareErr instanceof Error ? shareErr.message : String(shareErr)}`);
        }

        // Clean up old backups
        try {
          await cleanupOldBackups();
        } catch (cleanupErr) {
          console.warn('Cleanup of old backups failed (non-fatal):', cleanupErr);
        }
      } catch (fsError) {
        throw new Error(`Filesystem error: ${fsError instanceof Error ? fsError.message : String(fsError)}`);
      }
    }

    return {
      success: true,
      message: 'Enhanced backup created successfully',
      metadata: backup.metadata,
      fileName,
      uri
    };
  } catch (error) {
    console.error('Enhanced backup creation failed:', error);
    return {
      success: false,
      message: 'Failed to create enhanced backup',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

export const restoreFromEnhancedBackup = async (backupFileContent: string) => {
  try {
    const isWeb = Capacitor.getPlatform() === 'web';
    let backupContent: string = '';

    if (isWeb) {
      // For web, check if it's a localStorage key or a file upload
      if (backupFileContent.startsWith(WEB_BACKUP_PREFIX)) {
        // It's a localStorage key
        const stored = localStorage.getItem(backupFileContent);
        if (!stored) {
          throw new Error('Backup not found in storage');
        }
        backupContent = stored;
      } else {
        // It's a file that was uploaded, so the content is passed directly
        backupContent = stripBomAndTrim(backupFileContent);
      }
    } else {
      // For mobile, we also expect the file content directly
      backupContent = stripBomAndTrim(backupFileContent);
    }

    if (!backupContent) {
      throw new Error('The selected backup file is empty or could not be read.');
    }

    const backup: EnhancedBackupData = JSON.parse(backupContent);

    // Validate backup structure and checksum
    const calculatedChecksum = calculateChecksum(JSON.stringify(backup.data));
    if (calculatedChecksum !== backup.metadata.checksum) {
      throw new Error('Backup checksum validation failed. The file may be corrupt or altered.');
    }

    // Store all data
    localStorage.setItem('prakash_customers', JSON.stringify(backup.data.customers || []));
    localStorage.setItem('prakash_bills', JSON.stringify(backup.data.bills || []));
    localStorage.setItem('prakash_payments', JSON.stringify(backup.data.payments || []));
    localStorage.setItem('prakash_items', JSON.stringify(backup.data.items || []));
    localStorage.setItem('prakash_item_rate_history', JSON.stringify(backup.data.itemRateHistory || []));
    localStorage.setItem('prakash_business_analytics', JSON.stringify(backup.data.businessAnalytics || {}));

    // Trigger storage event for components to refresh
    window.dispatchEvent(new Event('storage'));

    return {
      success: true,
      message: 'Backup restored successfully',
      metadata: backup.metadata
    };
  } catch (error) {
    console.error('Backup restoration failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('JSON.parse')) {
      return {
        success: false,
        message: 'The selected backup file is not in a valid JSON format.',
        error: errorMessage
      };
    }

    return {
      success: false,
      message: errorMessage,
      error: errorMessage
    };
  }
};

// Function to clean up old backups (mobile)
const cleanupOldBackups = async () => {
  try {
    const result = await Filesystem.readdir({
      path: '',
      directory: DATA_DIR
    });

    // Sort backups by date (newest first)
    const backups = result.files
      .filter(file => file.name.startsWith('enhanced_backup_'))
      .sort((a, b) => b.name.localeCompare(a.name));

    // Remove excess backups
    for (let i = MAX_LOCAL_BACKUPS; i < backups.length; i++) {
      await Filesystem.deleteFile({
        path: backups[i].name,
        directory: DATA_DIR
      });
    }
  } catch (error) {
    console.error('Cleanup of old backups failed:', error);
  }
};

// Function to list available backups
export const listAvailableBackups = async () => {
  try {
    const isWeb = Capacitor.getPlatform() === 'web';
    
    if (isWeb) {
      // For web, read from localStorage
      const backupKeys: string[] = [];
      
      // Find all backup keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(WEB_BACKUP_PREFIX)) {
          backupKeys.push(key);
        }
      }

      const backups = backupKeys
        .map((key) => {
          try {
            const stored = localStorage.getItem(key);
            if (!stored) return null;
            
            const backup: EnhancedBackupData = JSON.parse(stored);
            const fileName = key.replace(WEB_BACKUP_PREFIX, '');
            
            // Create blob URL for download
            let uri: string | undefined;
            try {
              const blob = new Blob([stored], { type: 'application/json' });
              uri = URL.createObjectURL(blob);
            } catch {
              uri = undefined;
            }

            return {
              fileName,
              timestamp: backup.timestamp,
              metadata: backup.metadata,
              uri,
              storageKey: key // Include storage key for restore
            };
          } catch {
            return null;
          }
        })
        .filter((backup): backup is NonNullable<typeof backup> => backup !== null)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return backups;
    } else {
      // For mobile, use Filesystem API
      const result = await Filesystem.readdir({
        path: '',
        directory: DATA_DIR
      });

      const backups = await Promise.all(
        result.files
          .filter(file => file.name.startsWith('enhanced_backup_'))
          .map(async (file) => {
            try {
              const { data } = await Filesystem.readFile({
                path: file.name,
                directory: DATA_DIR
              });
              const backup: EnhancedBackupData = JSON.parse(data.toString());
              // Attempt to resolve a uri for this specific file; fall back to a blob URL
              let uri: string | undefined;
              try {
                const info = await Filesystem.getUri({ path: file.name, directory: DATA_DIR });
                uri = (info && (info as any).uri) || (info as any).path || undefined;
              } catch (e) {
                try {
                  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
                  uri = URL.createObjectURL(blob);
                } catch {
                  uri = undefined;
                }
              }

              return {
                fileName: file.name,
                timestamp: backup.timestamp,
                metadata: backup.metadata,
                uri
              };
            } catch {
              return null;
            }
          })
      );

      return backups.filter((backup): backup is NonNullable<typeof backup> => backup !== null)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
};