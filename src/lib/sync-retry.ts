import { fetchCloudSnapshot, pushCloudSnapshot, CloudUser } from './cloud';
import { delay } from './utils';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface SyncResult {
  success: boolean;
  message: string;
  error?: Error;
}

export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://www.google.com/generate_204');
    return response.status === 204;
  } catch {
    return false;
  }
};

export const checkPermissions = async (user: CloudUser): Promise<boolean> => {
  try {
    const testSnapshot = { test: true };
    await pushCloudSnapshot(user, testSnapshot);
    return true;
  } catch {
    return false;
  }
};

const retryOperation = async <T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delayMs = RETRY_DELAY
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    if (retries === 0) throw error;
    
    // Check if error is retryable
    if (error.code === 'PERMISSION_DENIED' || 
        error.code === 'auth/unauthorized-domain') {
      throw error; // Don't retry permission errors
    }
    
    await delay(delayMs);
    return retryOperation(operation, retries - 1, delayMs * 2);
  }
};

export const syncWithRetry = async (user: CloudUser, operation: 'push' | 'pull'): Promise<SyncResult> => {
  // Check network
  const isOnline = await checkNetworkStatus();
  if (!isOnline) {
    return {
      success: false,
      message: 'No internet connection. Please check your network.',
    };
  }

  // Check permissions
  const hasPermissions = await checkPermissions(user);
  if (!hasPermissions) {
    return {
      success: false,
      message: 'Missing or insufficient permissions. Please sign out and sign in again.',
    };
  }

  try {
    if (operation === 'push') {
      const snapshot = await buildLocalSnapshot();
      await retryOperation(() => pushCloudSnapshot(user, snapshot));
      return {
        success: true,
        message: 'Data successfully pushed to cloud',
      };
    } else {
      const cloudData = await retryOperation(() => fetchCloudSnapshot(user));
      if (cloudData) {
        await applySnapshotToLocal(cloudData);
        return {
          success: true,
          message: 'Data successfully pulled from cloud',
        };
      }
      return {
        success: true,
        message: 'No data found in cloud',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Sync failed',
      error,
    };
  }
};