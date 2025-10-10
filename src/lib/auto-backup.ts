import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { backupToGoogleDrive } from './google-drive';

// Schedule monthly backups
export const scheduleMonthlyBackup = () => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const timeUntilNextMonth = nextMonth.getTime() - now.getTime();

  // Schedule backup for the beginning of next month
  setTimeout(async () => {
    await performMonthlyBackup();
    // Schedule next month's backup
    scheduleMonthlyBackup();
  }, timeUntilNextMonth);
};

// Perform the actual backup
export const performMonthlyBackup = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  try {
    if (user) {
      await backupToGoogleDrive();
    }
  } catch (error) {
    console.error('Monthly backup failed:', error);
  }
};

// Initialize monthly backup scheduling
export const initializeAutoBackup = () => {
  // Check if user is signed in
  const auth = getAuth();
  auth.onAuthStateChanged((user) => {
    if (user) {
      scheduleMonthlyBackup();
    }
  });
};