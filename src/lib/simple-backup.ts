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

    console.log('Backup data:', data); // Debug log

    const backupJson = JSON.stringify(data, null, 2);
    const fileName = `billbuddy_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

    console.log('Backup JSON length:', backupJson.length); // Debug log

    // Create download link for web
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    console.log('Blob URL created:', url); // Debug log

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('Download triggered for file:', fileName); // Debug log
    }, 100);

    return {
      success: true,
      message: 'Backup created and downloaded successfully!',
      fileName
    };
  } catch (error) {
    console.error('Backup creation error:', error); // Debug log
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
