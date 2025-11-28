import { getAuth } from 'firebase/auth';
import { backupToGoogleDrive } from './google-drive';

const BACKUP_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export const initMonthlyBackup = () => {
  const auth = getAuth();
  
  // Listen for auth state changes
  auth.onAuthStateChanged((user) => {
    if (user) {
      scheduleNextBackup();
    }
  });
};

const scheduleNextBackup = () => {
  // Get current date
  const now = new Date();
  
  // Calculate next month's first day
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  // Calculate time until next backup
  const timeUntilBackup = nextMonth.getTime() - now.getTime();
  
  // Schedule backup
  setTimeout(async () => {
    const auth = getAuth();
    if (auth.currentUser) {
      try {
        // Perform the backup
        await backupToGoogleDrive();
        
        // Schedule next backup
        scheduleNextBackup();
      } catch (error) {
        console.error('Monthly backup failed:', error);
      }
    }
  }, timeUntilBackup);
};

export const checkLastBackupDate = () => {
  const lastBackup = localStorage.getItem('lastBackupDate');
  if (!lastBackup) return true;

  const lastBackupDate = new Date(lastBackup);
  const now = new Date();
  
  return now.getTime() - lastBackupDate.getTime() >= BACKUP_INTERVAL;
};

export const updateLastBackupDate = () => {
  localStorage.setItem('lastBackupDate', new Date().toISOString());
};