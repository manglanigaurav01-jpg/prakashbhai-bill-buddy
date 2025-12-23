import { getCustomers, getBills, getPayments, getItems } from './storage';

// Simple backup system that works locally
export const createSimpleBackup = async () => {
  try {
    const data = {
      customers: getCustomers(),
      bills: getBills(),
      payments: getPayments(),
      items: getItems(),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    const backupJson = JSON.stringify(data, null, 2);
    const fileName = `billbuddy_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

    // Create download link for web
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    return {
      success: true,
      message: 'Backup created and downloaded successfully!',
      fileName
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to create backup',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

export const restoreSimpleBackup = async (backupContent: string) => {
  try {
    const data = JSON.parse(backupContent);

    // Validate backup structure
    if (!data.customers || !data.bills || !data.payments || !data.items) {
      throw new Error('Invalid backup file format');
    }

    // Save to localStorage
    localStorage.setItem('prakash_customers', JSON.stringify(data.customers));
    localStorage.setItem('prakash_bills', JSON.stringify(data.bills));
    localStorage.setItem('prakash_payments', JSON.stringify(data.payments));
    localStorage.setItem('prakash_items', JSON.stringify(data.items));

    // Trigger storage event to refresh UI
    window.dispatchEvent(new Event('storage'));

    return {
      success: true,
      message: 'Backup restored successfully!'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to restore backup',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};
