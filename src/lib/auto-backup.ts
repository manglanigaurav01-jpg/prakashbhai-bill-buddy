import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { backupToGoogleDrive } from './google-drive';

// Schedule monthly backups at month end
export const scheduleMonthlyBackup = () => {
  const now = new Date();
  // Get last day of current month
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  lastDayOfMonth.setHours(23, 59, 59, 999); // Set to end of day
  
  let timeUntilMonthEnd = lastDayOfMonth.getTime() - now.getTime();
  
  // If we've passed the month end, schedule for next month end
  if (timeUntilMonthEnd < 0) {
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    nextMonthEnd.setHours(23, 59, 59, 999);
    timeUntilMonthEnd = nextMonthEnd.getTime() - now.getTime();
  }

  // Schedule backup for the end of current/next month
  setTimeout(async () => {
    await performMonthlyBackup();
    // Schedule next month's backup
    scheduleMonthlyBackup();
  }, timeUntilMonthEnd);
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