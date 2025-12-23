import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createFolderBasedBackup } from '../lib/simple-backup';
import * as storage from '../lib/storage';

// Mock the storage functions
vi.mock('../lib/storage', () => ({
  getCustomers: vi.fn(),
  getBills: vi.fn(),
  getPayments: vi.fn(),
  getItems: vi.fn(),
  getBillsByCustomer: vi.fn(),
}));

// Mock Capacitor modules
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'web'),
    isNativePlatform: vi.fn(() => false),
  },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    getUri: vi.fn(),
  },
  Directory: {
    DOCUMENTS: 'DOCUMENTS',
  },
}));

vi.mock('@capacitor/share', () => ({
  Share: {
    share: vi.fn(),
  },
}));

// Mock PDF generation
vi.mock('../lib/pdf', () => ({
  generateBillPDF: vi.fn(),
}));

describe('Folder-Based Backup', () => {
  const mockCustomers = [
    { id: '1', name: 'John Doe', createdAt: new Date().toISOString() },
    { id: '2', name: 'Jane Smith', createdAt: new Date().toISOString() },
  ];

  const mockBills = [
    { id: 'b1', customerId: '1', date: '2024-01-15', grandTotal: 100, items: [], createdAt: new Date().toISOString() },
    { id: 'b2', customerId: '1', date: '2024-01-20', grandTotal: 150, items: [], createdAt: new Date().toISOString() },
    { id: 'b3', customerId: '2', date: '2024-01-18', grandTotal: 200, items: [], createdAt: new Date().toISOString() },
  ];

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup mock return values
    (storage.getCustomers as Mock).mockReturnValue(mockCustomers);
    (storage.getBills as Mock).mockReturnValue(mockBills);
    (storage.getPayments as Mock).mockReturnValue([]);
    (storage.getItems as Mock).mockReturnValue([]);
    (storage.getBillsByCustomer as Mock).mockImplementation((customerId: string) => {
      return mockBills.filter(bill => bill.customerId === customerId);
    });

    // Mock PDF generation to succeed
    (generateBillPDF as Mock).mockResolvedValue({ success: true, message: 'PDF generated' });
  });

  it('should create folder-based backup successfully', async () => {
    const result = await createFolderBasedBackup();

    expect(result.success).toBe(true);
    expect(result.message).toContain('Folder-based backup created successfully');
    expect(result.folderName).toBeDefined();
    if (result.success && result.summary) {
      expect(result.summary.customersProcessed).toBe(2);
      expect(result.summary.totalPDFsGenerated).toBe(3); // 3 bills total
    }
  });

  it('should handle customers with no bills', async () => {
    // Mock no bills for any customer
    (storage.getBillsByCustomer as Mock).mockReturnValue([]);

    const result = await createFolderBasedBackup();

    expect(result.success).toBe(true);
    if (result.success && result.summary) {
      expect(result.summary.customersProcessed).toBe(0);
      expect(result.summary.totalPDFsGenerated).toBe(0);
    }
  });

  it('should handle empty customer list', async () => {
    (storage.getCustomers as Mock).mockReturnValue([]);

    const result = await createFolderBasedBackup();

    expect(result.success).toBe(false);
    expect(result.error).toBe('NO_CUSTOMERS');
    expect(result.message).toContain('No customers found to backup');
  });

  it('should sanitize customer names for folder creation', async () => {
    const customersWithSpecialChars = [
      { id: '1', name: 'John/Doe@#$%', createdAt: new Date().toISOString() },
    ];

    (storage.getCustomers as Mock).mockReturnValue(customersWithSpecialChars);
    (storage.getBillsByCustomer as Mock).mockReturnValue([mockBills[0]]);

    const { Filesystem } = await import('@capacitor/filesystem');
    const mkdirMock = Filesystem.mkdir as Mock;

    await createFolderBasedBackup();

    // Check that mkdir was called with sanitized folder name
    expect(mkdirMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('John_Doe_____'), // Special chars replaced with underscores
      })
    );
  });

  it('should handle PDF generation failures gracefully', async () => {
    (generateBillPDF as Mock).mockResolvedValue({ success: false, message: 'PDF generation failed' });

    const result = await createFolderBasedBackup();

    expect(result.success).toBe(true); // Should still succeed even if some PDFs fail
    if (result.success && result.summary) {
      expect(result.summary.totalPDFsGenerated).toBe(0); // No PDFs generated
    }
  });

  it('should create proper folder structure', async () => {
    const { Filesystem } = await import('@capacitor/filesystem');
    const mkdirMock = Filesystem.mkdir as Mock;

    await createFolderBasedBackup();

    // Should create main folder
    expect(mkdirMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringMatching(/^BillBuddyBackup_\d{4}-\d{2}-\d{2}/),
        recursive: true,
      })
    );

    // Should create customer folders
    expect(mkdirMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('John_Doe'),
      })
    );
    expect(mkdirMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('Jane_Smith'),
      })
    );
  });
});
