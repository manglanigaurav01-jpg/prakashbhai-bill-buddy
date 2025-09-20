import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

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

const getAllDataSnapshot = async () => {
  const { getCustomers, getBills, getPayments, getItems, getRateHistory } = await import('@/lib/storage');
  const snapshot = {
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
  return snapshot;
};

export const createBackupBlob = async (): Promise<Blob> => {
  const snapshot = await getAllDataSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  return new Blob([json], { type: 'application/json' });
};

// --- Crypto helpers for optional password-protected backups ---
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const sha256 = async (data: ArrayBuffer): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const deriveKey = async (password: string, salt: Uint8Array, iterations = 100000) => {
  const keyMaterial = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
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
        directory: Directory.Cache,
      });

      const fileUri = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
      // Avoid bundler resolution errors on web/dev where plugin isn't installed
      const { Share } = await import(/* @vite-ignore */ '@capacitor/share');
      await Share.share({
        title: opts?.providerLabel ? `Bill Buddy Backup (${opts.providerLabel})` : 'Bill Buddy Backup',
        text: opts?.providerLabel ? `Backup for ${opts.providerLabel}` : 'App backup file',
        url: fileUri.uri,
        dialogTitle: 'Save or Share Backup (OneDrive, Files, etc.)',
      });
    } else {
      // Web: trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Update last run
    const cfg = getBackupConfig();
    cfg.lastRunAt = new Date().toISOString();
    saveBackupConfig(cfg);

    return { success: true, message: 'Backup created successfully' };
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

    // Apply snapshot
    localStorage.setItem('prakash_customers', JSON.stringify(snapshot.data?.customers ?? snapshot.customers ?? []));
    localStorage.setItem('prakash_bills', JSON.stringify(snapshot.data?.bills ?? snapshot.bills ?? []));
    localStorage.setItem('prakash_payments', JSON.stringify(snapshot.data?.payments ?? snapshot.payments ?? []));
    localStorage.setItem('prakash_items', JSON.stringify(snapshot.data?.items ?? snapshot.items ?? []));
    localStorage.setItem('prakash_item_rate_history', JSON.stringify(snapshot.data?.itemRateHistory ?? snapshot.itemRateHistory ?? []));

    return { success: true, message: 'Backup restored successfully' };
  } catch (e) {
    console.error('Restore failed:', e);
    return { success: false, message: 'Failed to restore backup' };
  }
};


