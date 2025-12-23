import { getCustomers, getBills, getPayments, getItems } from './storage';

// Simple backup system that works locally
export const createSimpleBackup = async () => {
  try {
    const customers = getCustomers();
    const bills = getBills();
    const payments = getPayments();
    const items = getItems();

    console.log('Raw data from storage:', { customers, bills, payments, items }); // Debug log

    // Check if there's any data to backup
    const hasData = customers.length > 0 || bills.length > 0 || payments.length > 0 || items.length > 0;

    if (!hasData) {
      console.warn('No data found to backup'); // Debug log
      return {
        success: false,
        message: 'No data found to backup. Please add some customers, bills, or items first.',
        error: 'EMPTY_DATA'
      };
    }

    const data = {
      customers,
      bills,
      payments,
      items,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      summary: {
        customerCount: customers.length,
        billCount: bills.length,
        paymentCount: payments.length,
        itemCount: items.length
      }
    };

    console.log('Backup data prepared:', data); // Debug log

    const backupJson = JSON.stringify(data, null, 2);
    const fileName = `billbuddy_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

    console.log('Backup JSON length:', backupJson.length); // Debug log
    console.log('Backup contains data for:', data.summary); // Debug log

    // Create download link for web
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    console.log('Blob URL created:', url); // Debug log
    console.log('File name:', fileName); // Debug log

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    // Try multiple approaches to trigger download
    try {
      // Method 1: Direct click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('Download triggered via direct click'); // Debug log
    } catch (error) {
      console.error('Direct click failed, trying alternative method:', error);
      // Method 2: Use window.open as fallback
      try {
        window.open(url, '_blank');
        console.log('Download triggered via window.open'); // Debug log
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
      }
    }

    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

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
