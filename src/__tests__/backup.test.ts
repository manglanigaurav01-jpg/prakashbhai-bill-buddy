// Unit tests for backup and restore functions
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEnhancedBackup, restoreFromEnhancedBackup } from '../lib/enhanced-backup';
import * as storage from '../lib/storage';

// Mock the storage functions
vi.mock('../lib/storage', () => ({
  getCustomers: vi.fn(),
  getBills: vi.fn(),
  getPayments: vi.fn(),
  getItems: vi.fn(),
  getRateHistory: vi.fn(),
  getBusinessAnalytics: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Backup and Restore', () => {
  const mockCustomers = [{ id: '1', name: 'Test Customer' }];
  const mockBills = [{ id: 'b1', customerId: '1', grandTotal: 100, date: new Date().toISOString() }];
  const mockPayments = [{ id: 'p1', customerId: '1', amount: 50, date: new Date().toISOString() }];
  const mockItems = [{ id: 'i1', name: 'Test Item', rate: 10 }];
  const mockRateHistory = [{ itemId: 'i1', rate: 10, date: new Date().toISOString() }];
  const mockAnalytics = { totalRevenue: 1000 };

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    localStorageMock.clear();

    // Setup mock return values for storage functions
    (storage.getCustomers as vi.Mock).mockReturnValue(mockCustomers);
    (storage.getBills as vi.Mock).mockReturnValue(mockBills);
    (storage.getPayments as vi.Mock).mockReturnValue(mockPayments);
    (storage.getItems as vi.Mock).mockReturnValue(mockItems);
    (storage.getRateHistory as vi.Mock).mockReturnValue(mockRateHistory);
    (storage.getBusinessAnalytics as vi.Mock).mockReturnValue(mockAnalytics);
  });

  it('should create a valid backup', async () => {
    const backupResult = await createEnhancedBackup();
    expect(backupResult.success).toBe(true);
    expect(backupResult.metadata).toBeDefined();

    // The backup creation on web triggers a download, so we can't easily get the content here.
    // Instead, we trust the implementation that was fixed.
    // We can, however, check the localStorage backup.
    const backupKey = Object.keys(window.localStorage).find(k => k.startsWith('prakash_web_backup_'));
    expect(backupKey).toBeDefined();
    
    if(backupKey) {
        const backupContent = localStorageMock.getItem(backupKey);
        expect(backupContent).toBeDefined();
        const backupData = JSON.parse(backupContent!);
        expect(backupData.version).toBe('2.0.0');
        expect(backupData.data.customers).toEqual(mockCustomers);
        expect(backupData.metadata.checksum).toBeDefined();
    }
  });

  it('should restore a valid backup', async () => {
    // 1. Create a backup string manually, reflecting the structure
    const backupData = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      data: {
        customers: mockCustomers,
        bills: mockBills,
        payments: mockPayments,
        items: mockItems,
        itemRateHistory: mockRateHistory,
        businessAnalytics: mockAnalytics,
      },
      metadata: {
        checksum: 'will-be-recalculated',
        counts: { customers: 1, bills: 1, payments: 1, items: 1, itemRateHistory: 1 },
        totalAmount: { billed: 100, paid: 50, outstanding: 50 },
        dateRange: { firstBill: '', lastBill: '', firstPayment: '', lastPayment: '' },
      },
    };

    const calculateChecksum = (data: string): string => {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash.toString(16);
    };

    const dataString = JSON.stringify(backupData.data);
    backupData.metadata.checksum = calculateChecksum(dataString);
    const backupContent = JSON.stringify(backupData);

    // 2. Restore from the backup
    const restoreResult = await restoreFromEnhancedBackup(backupContent);

    // 3. Assertions
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.message).toBe('Backup restored successfully');
    
    expect(localStorageMock.getItem('prakash_customers')).toBe(JSON.stringify(mockCustomers));
    expect(localStorageMock.getItem('prakash_bills')).toBe(JSON.stringify(mockBills));
    expect(localStorageMock.getItem('prakash_payments')).toBe(JSON.stringify(mockPayments));
  });

  it('should fail to restore with invalid JSON', async () => {
    const invalidContent = 'this is not json';
    const result = await restoreFromEnhancedBackup(invalidContent);
    expect(result.success).toBe(false);
    expect(result.message).toContain('not in a valid JSON format');
  });

  it('should fail to restore with incorrect checksum', async () => {
    const backupData = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        data: { customers: mockCustomers, bills: [], payments: [], items: [], itemRateHistory: [], businessAnalytics: {} },
        metadata: { checksum: 'wrong-checksum' },
      };
    const backupContent = JSON.stringify(backupData);
    const result = await restoreFromEnhancedBackup(backupContent);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Backup checksum validation failed');
  });
});
