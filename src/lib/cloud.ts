import { getBackupConfig } from '@/lib/backup';
import { initFirebase, firebaseSignInWithGoogle, firebaseSignOut, readUserSnapshot, writeUserSnapshot } from '@/lib/firebase';

export type CloudProvider = 'google' | 'microsoft';

export interface CloudUser {
  provider: CloudProvider;
  userId: string;
  displayName: string;
  email: string;
}

const CLOUD_USER_KEY = 'cloud_user_v1';

export const getCurrentUser = (): CloudUser | null => {
  const raw = localStorage.getItem(CLOUD_USER_KEY);
  return raw ? JSON.parse(raw) as CloudUser : null;
};

export const signOut = (): void => {
  localStorage.removeItem(CLOUD_USER_KEY);
};

// NOTE: Placeholder implementations to avoid extra deps. Replace with real SDK flows.
export const signInWithGoogle = async (): Promise<CloudUser> => {
  const svc = initFirebase();
  if (!svc) throw new Error('FIREBASE_NOT_CONFIGURED');
  const fbUser = await firebaseSignInWithGoogle();
  const user: CloudUser = { provider: 'google', userId: fbUser.uid, displayName: fbUser.displayName || fbUser.email || 'User', email: fbUser.email || '' };
  localStorage.setItem(CLOUD_USER_KEY, JSON.stringify(user));
  return user;
};

export const signInWithMicrosoft = async (): Promise<CloudUser> => {
  const email = prompt('Enter Microsoft email to simulate login:') || '';
  if (!email) throw new Error('LOGIN_CANCELLED');
  const user: CloudUser = { provider: 'microsoft', userId: email.toLowerCase(), displayName: email.split('@')[0], email };
  localStorage.setItem(CLOUD_USER_KEY, JSON.stringify(user));
  return user;
};

// Data sync using localStorage as a mock cloud store to keep app functional.
// Replace with Firebase/Graph API calls in real deployment.
const CLOUD_STORE_PREFIX = 'mock_cloud_store_v1';

const cloudKey = (user: CloudUser) => `${CLOUD_STORE_PREFIX}:${user.provider}:${user.userId}`;

export const fetchCloudSnapshot = async (user: CloudUser): Promise<any | null> => {
  if (user.provider === 'google') {
    return await readUserSnapshot(user.userId);
  }
  const raw = localStorage.getItem(cloudKey(user));
  return raw ? JSON.parse(raw) : null;
};

export const pushCloudSnapshot = async (user: CloudUser, snapshot: any): Promise<void> => {
  if (user.provider === 'google') {
    await writeUserSnapshot(user.userId, snapshot);
    return;
  }
  localStorage.setItem(cloudKey(user), JSON.stringify(snapshot));
};

export const buildLocalSnapshot = async () => {
  const { getCustomers, getBills, getPayments, getItems, getRateHistory } = await import('@/lib/storage');
  return {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    customers: getCustomers(),
    bills: getBills(),
    payments: getPayments(),
    items: getItems(),
    itemRateHistory: getRateHistory(),
  };
};

export const applySnapshotToLocal = async (snapshot: any) => {
  const data = snapshot;
  if (!data) return;
  // Write to localStorage using storage.ts keys
  localStorage.setItem('prakash_customers', JSON.stringify(data.customers || []));
  localStorage.setItem('prakash_bills', JSON.stringify(data.bills || []));
  localStorage.setItem('prakash_payments', JSON.stringify(data.payments || []));
  localStorage.setItem('prakash_items', JSON.stringify(data.items || []));
  localStorage.setItem('prakash_item_rate_history', JSON.stringify(data.itemRateHistory || []));
};

export const syncDown = async (): Promise<{ success: boolean; message: string }> => {
  const user = getCurrentUser();
  if (!user) return { success: false, message: 'Not logged in' };
  
  // Try to sync with retry mechanism
  const result = await import('./sync-retry').then(m => m.syncWithRetry(user, 'pull'));
  return result;
};

export const syncUp = async (): Promise<{ success: boolean; message: string }> => {
  const user = getCurrentUser();
  if (!user) return { success: false, message: 'Not logged in' };
  
  // Try to sync with retry mechanism
  const result = await import('./sync-retry').then(m => m.syncWithRetry(user, 'push'));
  return result;
  const snapshot = await buildLocalSnapshot();
  await pushCloudSnapshot(user, snapshot);
  return { success: true, message: 'Data synced to cloud' };
};

let syncTimer: any = null;
export const initCloudSync = () => {
  const setup = () => {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
    const user = getCurrentUser();
    if (!user) return;
    // Basic periodic two-way sync: pull then push
    syncTimer = setInterval(async () => {
      await syncDown();
      await syncUp();
    }, 10 * 60 * 1000); // every 10 minutes
  };

  setup();
  window.addEventListener('storage', (e) => {
    if (e.key === CLOUD_USER_KEY) setup();
  });
};


