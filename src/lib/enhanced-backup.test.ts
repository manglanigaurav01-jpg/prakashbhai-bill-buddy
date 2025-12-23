import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnhancedBackup, restoreFromEnhancedBackup, listAvailableBackups } from './enhanced-backup';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'web'),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock storage functions
vi.mock('./storage', () => ({
  getCustomers: vi.fn(() => [{ id: '1', name: 'Test Customer' }]),
  getBills: vi.fn(() => [{ id: '1', customerId: '1', amount: 100 }]),
  getPayments: vi.fn(() => [{ id: '1', billId: '1', amount: 50 }]),
  getItems: vi.fn(() => [{ id: '1', name: 'Test Item', rate: 10 }]),
  getRateHistory: vi.fn(() => []),
  saveCustomer: vi.fn(),
  saveBill: vi.fn(),
  savePayment: vi.fn(),
  saveItem: vi.fn(),
}));

describe('Enhanced Backup System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('createEnhancedBackup', () => {
    it('should create a backup successfully', async () => {
      const result = await createEnhancedBackup();

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.counts.customers).toBe(1);
      expect(result.metadata?.counts.bills).toBe(1);
      expect(result.metadata?.counts.payments).toBe(1);
      expect(result.metadata?.counts.items).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      // Mock an error in storage
      const { getCustomers } = await import('./storage');
      vi.mocked(getCustomers).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await createEnhancedBackup();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Storage error');
    });
  });

  describe('listAvailableBackups', () => {
    it('should list available backups', async () => {
      // Create a backup first
      await createEnhancedBackup();

      const backups = await listAvailableBackups();

      expect(backups.length).toBeGreaterThan(0);
      expect(backups[0]).toHaveProperty('fileName');
      expect(backups[0]).toHaveProperty('timestamp');
      expect(backups[0]).toHaveProperty('metadata');
    });
  });

  describe('restoreFromEnhancedBackup', () => {
    it('should restore from backup successfully', async () => {
      // Create a backup first
      const createResult = await createEnhancedBackup();
      expect(createResult.success).toBe(true);

      // Get the backup data
      const backups = await listAvailableBackups();
      const backupData = backups[0];

      // Restore from backup
      const restoreResult = await restoreFromEnhancedBackup(backupData.fileName);

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.metadata).toBeDefined();
    });

    it('should handle invalid backup data', async () => {
      const result = await restoreFromEnhancedBackup('invalid-backup.json');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
