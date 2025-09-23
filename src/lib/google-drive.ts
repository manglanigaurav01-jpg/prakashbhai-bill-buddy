import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from '@/hooks/use-toast';
import { getBills, getPayments, getCustomers, getItems } from '@/lib/storage';

const storage = getStorage();

export const backupToGoogleDrive = async (encryptionPassword?: string) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Please sign in first to backup to Google Drive');
    }

    // Prepare backup data
    const backup = {
      bills: getBills(),
      customers: getCustomers(),
      payments: getPayments(),
      items: getItems(),
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    // Convert to string
    const backupStr = JSON.stringify(backup);

    // Optional encryption if password provided
    let finalData = backupStr;
    if (encryptionPassword) {
      const encoder = new TextEncoder();
      const data = encoder.encode(backupStr);
      
      // Generate key from password
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(encryptionPassword),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // Generate salt
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      
      // Derive key
      const key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt']
      );
      
      // Generate IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      
      // Combine salt + iv + encrypted data
      const encryptedArray = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      encryptedArray.set(salt, 0);
      encryptedArray.set(iv, salt.length);
      encryptedArray.set(new Uint8Array(encrypted), salt.length + iv.length);
      
      finalData = Array.from(encryptedArray).join(',');
    }

    // Create file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `billbuddy_backup_${timestamp}.json`;
    
    // Create reference to the file in Firebase Storage
    const fileRef = ref(storage, `backups/${user.uid}/${fileName}`);
    
    // Upload the file
    await uploadBytes(fileRef, new Blob([finalData]));
    
    // Get the download URL
    const downloadURL = await getDownloadURL(fileRef);

    return {
      success: true,
      message: 'Backup successfully uploaded to Google Drive',
      url: downloadURL
    };

  } catch (error: any) {
    console.error('Google Drive backup error:', error);
    return {
      success: false,
      message: error.message || 'Failed to backup to Google Drive',
      error
    };
  }
};

export const restoreFromGoogleDrive = async (downloadUrl: string, encryptionPassword?: string) => {
  try {
    // Fetch the backup file
    const response = await fetch(downloadUrl);
    const content = await response.text();

    let backupData;

    if (encryptionPassword) {
      // Convert comma-separated string back to Uint8Array
      const encryptedArray = new Uint8Array(content.split(',').map(Number));
      
      // Extract salt, iv and encrypted data
      const salt = encryptedArray.slice(0, 16);
      const iv = encryptedArray.slice(16, 28);
      const encrypted = encryptedArray.slice(28);

      // Generate key from password
      const encoder = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(encryptionPassword),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // Derive key
      const key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['decrypt']
      );
      
      // Decrypt
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      // Convert to string
      const decoder = new TextDecoder();
      backupData = JSON.parse(decoder.decode(decrypted));
    } else {
      backupData = JSON.parse(content);
    }

    // Validate backup format
    if (!backupData || !backupData.version || !backupData.timestamp) {
      throw new Error('Invalid backup file format');
    }

    // Store the data
    localStorage.setItem('prakash_bills', JSON.stringify(backupData.bills || []));
    localStorage.setItem('prakash_customers', JSON.stringify(backupData.customers || []));
    localStorage.setItem('prakash_payments', JSON.stringify(backupData.payments || []));
    localStorage.setItem('prakash_items', JSON.stringify(backupData.items || []));

    // Trigger UI refresh
    window.dispatchEvent(new Event('storage'));

    return {
      success: true,
      message: 'Backup restored successfully'
    };

  } catch (error: any) {
    console.error('Google Drive restore error:', error);
    return {
      success: false,
      message: error.message || 'Failed to restore from Google Drive',
      error
    };
  }
};

export const listGoogleDriveBackups = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Please sign in first to access Google Drive backups');
    }

    // List all files in the backups folder
    const folderRef = ref(storage, `backups/${user.uid}`);
    
    // Firebase Storage doesn't have a direct list operation,
    // so we'll return the folder reference for the UI to handle
    return {
      success: true,
      folderRef,
      message: 'Ready to list backups'
    };

  } catch (error: any) {
    console.error('List Google Drive backups error:', error);
    return {
      success: false,
      message: error.message || 'Failed to list Google Drive backups',
      error
    };
  }
};