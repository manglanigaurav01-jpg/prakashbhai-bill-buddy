import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { backupToGoogleDrive } from './google-drive';

export interface AutoBackupResult {
  success: boolean;
  message: string;
  nextBackupDate?: Date;
}

/**
 * Initialize automatic backup system
 * Sets up monthly backups when user is signed in
 */
export const initializeAutoBackup = (): AutoBackupResult => {
  try {
    const auth = getAuth();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // User signed in, schedule monthly backups
        scheduleMonthlyBackup();
      } else {
        // User signed out, clear any scheduled backups
        clearScheduledBackup();
      }
    });

    // Store unsubscribe function for cleanup if needed
    (window as any).__autoBackupUnsubscribe = unsubscribe;

    return {
      success: true,
      message: 'Auto backup system initialized'
    };
  } catch (error) {
    console.error('Failed to initialize auto backup:', error);
    return {
      success: false,
      message: 'Failed to initialize auto backup system'
    };
  }
};

/**
 * Schedule monthly backup for the current user
 */
const scheduleMonthlyBackup = () => {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      return;
    }

    // Clear any existing scheduled backup
    clearScheduledBackup();

    // Calculate next month's first day
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Calculate time until next backup (in milliseconds)
    const timeUntilBackup = nextMonth.getTime() - now.getTime();

    // Schedule the backup
    const timeoutId = setTimeout(async () => {
      try {
        // Perform the backup
        await backupToGoogleDrive();

        // Update last backup date
        localStorage.setItem('lastAutoBackupDate', new Date().toISOString());

        // Schedule next backup
        scheduleMonthlyBackup();
      } catch (error) {
        console.error('Monthly auto backup failed:', error);
        // Still schedule next backup even if current one failed
        scheduleMonthlyBackup();
      }
    }, timeUntilBackup);

    // Store timeout ID for cleanup
    (window as any).__autoBackupTimeoutId = timeoutId;

    console.log(`Monthly backup scheduled for ${nextMonth.toLocaleDateString()}`);

    return {
      success: true,
      message: 'Monthly backup scheduled',
      nextBackupDate: nextMonth
    };
  } catch (error) {
    console.error('Failed to schedule monthly backup:', error);
    return {
      success: false,
      message: 'Failed to schedule monthly backup'
    };
  }
};

/**
 * Clear any scheduled backup
 */
const clearScheduledBackup = () => {
  const timeoutId = (window as any).__autoBackupTimeoutId;
  if (timeoutId) {
    clearTimeout(timeoutId);
    delete (window as any).__autoBackupTimeoutId;
  }
};

/**
 * Manually trigger an auto backup
 */
export const triggerAutoBackup = async (): Promise<AutoBackupResult> => {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      return {
        success: false,
        message: 'No user signed in'
      };
    }

    await backupToGoogleDrive();

    // Update last backup date
    localStorage.setItem('lastAutoBackupDate', new Date().toISOString());

    return {
      success: true,
      message: 'Auto backup completed successfully'
    };
  } catch (error) {
    console.error('Manual auto backup failed:', error);
    return {
      success: false,
      message: 'Auto backup failed'
    };
  }
};

/**
 * Get status of auto backup system
 */
export const getAutoBackupStatus = () => {
  const auth = getAuth();
  const isSignedIn = !!auth.currentUser;
  const lastBackupDate = localStorage.getItem('lastAutoBackupDate');

  return {
    isEnabled: isSignedIn,
    isSignedIn,
    lastBackupDate: lastBackupDate ? new Date(lastBackupDate) : null,
    nextBackupDate: isSignedIn ? calculateNextBackupDate() : null
  };
};

/**
 * Calculate the next backup date (first day of next month)
 */
const calculateNextBackupDate = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
};

/**
 * Cleanup auto backup system
 */
export const cleanupAutoBackup = () => {
  clearScheduledBackup();

  const unsubscribe = (window as any).__autoBackupUnsubscribe;
  if (unsubscribe) {
    unsubscribe();
    delete (window as any).__autoBackupUnsubscribe;
  }
};
