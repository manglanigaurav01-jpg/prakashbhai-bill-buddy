import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { uploadToOneDrive, checkOneDriveConnection } from './onedrive';
import { takeSnapshot, restoreSnapshot } from './async-storage';

type BackupFrequency = 'daily' | 'weekly' | 'monthly';
type BackupMode = 'automatic' | 'manual';

export interface BackupConfig {
  mode: BackupMode;
  frequency: BackupFrequency;
  lastRunAt?: string; // ISO string
}

const BACKUP_CONFIG_KEY = 'backup_config_v1';

const frequencyToMs = (freq: BackupFrequency): number => {
  switch (freq) {
    case 'daily':
      return 24 * 60 * 60 * 1000;
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000;
    case 'monthly':
      return 30 * 24 * 60 * 60 * 1000;
  }
};

export const getDefaultBackupConfig = (): BackupConfig => ({
  mode: 'automatic',
  frequency: 'weekly',
});

export const getBackupConfig = (): BackupConfig => {
  try {
    const raw = localStorage.getItem(BACKUP_CONFIG_KEY);
    if (!raw) return getDefaultBackupConfig();
    const cfg = JSON.parse(raw) as BackupConfig;
    // Ensure defaults if fields missing
    return {
      mode: cfg.mode || 'automatic',
      frequency: cfg.frequency || 'weekly',
      lastRunAt: cfg.lastRunAt,
    };
  } catch {
    return getDefaultBackupConfig();
  }
};

export const saveBackupConfig = (config: BackupConfig): void => {
  localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(config));
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const DATA_KEYS = [
  'prakash_customers',
  'prakash_bills',
  'prakash_payments',
  'prakash_items',
  'prakash_item_rate_history',
  'prakash_business_analytics',
];

const getAllDataSnapshot = async () => {
  // Use async IndexedDB snapshot where available, falling back to existing storage modules
  try {
    const data = await takeSnapshot(DATA_KEYS);
    return {
      version: '1.0',
      createdAt: new Date().toISOString(),
      data: {
        customers: data['prakash_customers'] ?? [],
        bills: data['prakash_bills'] ?? [],
        payments: data['prakash_payments'] ?? [],
        items: data['prakash_items'] ?? [],
        itemRateHistory: data['prakash_item_rate_history'] ?? [],
        businessAnalytics: data['prakash_business_analytics'] ?? null,
      },
    };
  } catch (e) {
    // fallback to synchronous storage module (existing behavior)
    const { getCustomers, getBills, getPayments, getItems, getRateHistory } = await import('@/lib/storage');
    return {
      version: '1.0',
      createdAt: new Date().toISOString(),
      data: {
        customers: getCustomers(),
        bills: getBills(),
        payments: getPayments(),
        items: getItems(),
        itemRateHistory: getRateHistory(),
      },
    };
  }
};

export const createBackupBlob = async (): Promise<Blob> => {
  const snapshot = await getAllDataSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  return new Blob([json], { type: 'application/json' });
};

// --- Crypto helpers for optional password-protected backups ---
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const sha256 = async (data: Uint8Array): Promise<string> => {
  const buffer = new ArrayBuffer(data.length);
  const view = new Uint8Array(buffer);
  view.set(data);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const deriveKey = async (password: string, salt: Uint8Array, iterations = 100000) => {
  const keyMaterial = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  const safeSalt = new Uint8Array(salt);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: safeSalt.buffer, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return key;
};

const encryptJson = async (plaintextJson: string, password: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plaintextJson));
  const checksum = await sha256(textEncoder.encode(plaintextJson));
  return {
    meta: {
      version: '1',
      encrypted: true,
      algorithm: 'AES-GCM',
      salt: Array.from(salt),
      iv: Array.from(iv),
      iterations: 100000,
      checksum,
    },
    data: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
};

const decryptJson = async (payload: any, password: string): Promise<string> => {
  const salt = new Uint8Array(payload.meta.salt);
  const iv = new Uint8Array(payload.meta.iv);
  const key = await deriveKey(password, salt, payload.meta.iterations || 100000);
  const raw = atob(payload.data);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, buf);
  const json = textDecoder.decode(plaintext);
  const checksum = await sha256(textEncoder.encode(json));
  if (checksum !== payload.meta.checksum) throw new Error('CHECKSUM_MISMATCH');
  return json;
};

export const createBackupBlobSecure = async (password?: string): Promise<Blob> => {
  const snapshot = await getAllDataSnapshot();
  const json = JSON.stringify(snapshot);
  if (password && password.trim()) {
    const encrypted = await encryptJson(json, password.trim());
    return new Blob([JSON.stringify(encrypted)], { type: 'application/json' });
  }
  const checksum = await sha256(textEncoder.encode(json));
  const plainPayload = { meta: { version: '1', encrypted: false, checksum }, data: JSON.parse(json) };
  return new Blob([JSON.stringify(plainPayload)], { type: 'application/json' });
};

export const runBackupNow = async (password?: string, opts?: { providerLabel?: 'OneDrive' | 'Google Drive' }): Promise<{ success: boolean; message: string }> => {
  try {
    const blob = await createBackupBlobSecure(password);
    const fileName = `billbuddy_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    if (Capacitor.isNativePlatform()) {
      const arrayBuffer = await blob.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: 'CACHE',
      });

      const fileUri = await Filesystem.getUri({ directory: 'CACHE', path: fileName });
      // Avoid bundler resolution errors on web/dev where plugin isn't installed
      const { Share } = await import(/* @vite-ignore */ '@capacitor/share');
      await Share.share({
        title: opts?.providerLabel ? `Bill Buddy Backup (${opts.providerLabel})` : 'Bill Buddy Backup',
        text: opts?.providerLabel ? `Backup for ${opts.providerLabel}` : 'App backup file',
        url: fileUri.uri,
        dialogTitle: 'Save or Share Backup (OneDrive, Files, etc.)',
      });
    } else {
      // Web: trigger download or share
      if (opts?.providerLabel === 'OneDrive') {
        // For OneDrive on web, use Share API
        const { Share } = await import('@capacitor/share');
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(blob);
        });

        await Share.share({
          title: 'Bill Buddy Backup',
          text: `Backup file: ${fileName}`,
          url: `data:application/json;base64,${base64}`,
          dialogTitle: 'Save to OneDrive'
        });
      } else {
        // Regular download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }

    // Update last run
    const cfg = getBackupConfig();
    cfg.lastRunAt = new Date().toISOString();
    saveBackupConfig(cfg);

    // Return metadata for UI (web or native) so caller can show saved URI/path
    return {
      success: true,
      message: opts?.providerLabel === 'OneDrive' ? 'Backup shared to OneDrive successfully' : 'Backup created successfully',
      // Note: callers can inspect files via platform APIs if needed
    } as any;
  } catch (error) {
    console.error('Backup failed:', error);
    return { success: false, message: 'Failed to create backup' };
  }
};

let autoBackupTimer: any = null;

export const initAutoBackup = (): void => {
  const setupTimer = () => {
    if (autoBackupTimer) {
      clearInterval(autoBackupTimer);
      autoBackupTimer = null;
    }
    const cfg = getBackupConfig();
    if (cfg.mode !== 'automatic') return;
    const interval = frequencyToMs(cfg.frequency);

    // Periodic check (every hour) if due; cheaper than huge interval
    autoBackupTimer = setInterval(async () => {
      const current = getBackupConfig();
      if (current.mode !== 'automatic') return;
      const last = current.lastRunAt ? new Date(current.lastRunAt).getTime() : 0;
      const now = Date.now();
      if (now - last >= frequencyToMs(current.frequency)) {
        await runBackupNow();
      }
    }, 60 * 60 * 1000); // hourly check
  };

  setupTimer();

  // Listen for config changes via storage events (best-effort on same tab)
  window.addEventListener('storage', (e) => {
    if (e.key === BACKUP_CONFIG_KEY) {
      setupTimer();
    }
  });
};

export const restoreBackupFromBlob = async (blob: Blob, password?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const text = await blob.text();
    const payload = JSON.parse(text);
    let snapshot: any;
    if (payload?.meta?.encrypted) {
      if (!password || !password.trim()) {
        return { success: false, message: 'Password required for encrypted backup' };
      }
      const json = await decryptJson(payload, password.trim());
      snapshot = JSON.parse(json);
    } else if (payload?.meta) {
      // Unencrypted structured payload
      snapshot = { ...payload.data };
    } else {
      // Legacy unwrapped snapshot
      snapshot = payload;
    }
    // Apply snapshot via async restore where possible
    try {
      const dataToRestore = snapshot.data ?? snapshot;
      const mapped: Record<string, any> = {
        prakash_customers: dataToRestore.customers ?? dataToRestore.customers ?? [],
        prakash_bills: dataToRestore.bills ?? dataToRestore.bills ?? [],
        prakash_payments: dataToRestore.payments ?? dataToRestore.payments ?? [],
        prakash_items: dataToRestore.items ?? dataToRestore.items ?? [],
        prakash_item_rate_history: dataToRestore.itemRateHistory ?? dataToRestore.itemRateHistory ?? [],
      };
      await restoreSnapshot(mapped);
      return { success: true, message: 'Backup restored successfully' };
    } catch (e) {
      // fallback to synchronous localStorage writes
      localStorage.setItem('prakash_customers', JSON.stringify(snapshot.data?.customers ?? snapshot.customers ?? []));
      localStorage.setItem('prakash_bills', JSON.stringify(snapshot.data?.bills ?? snapshot.bills ?? []));
      localStorage.setItem('prakash_payments', JSON.stringify(snapshot.data?.payments ?? snapshot.payments ?? []));
      localStorage.setItem('prakash_items', JSON.stringify(snapshot.data?.items ?? snapshot.items ?? []));
      localStorage.setItem('prakash_item_rate_history', JSON.stringify(snapshot.data?.itemRateHistory ?? snapshot.itemRateHistory ?? []));
      return { success: true, message: 'Backup restored successfully (fallback)' };
    }
  } catch (e) {
    console.error('Restore failed:', e);
    return { success: false, message: 'Failed to restore backup' };
  }
};


