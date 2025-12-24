import { getCustomers, getBills, getPayments, getItems, getAllCustomerBalances, getBillsByCustomer } from './storage';
import { generateLastBalancePDF } from './last-balance-pdf';
import { generateBillPDF } from './pdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Helper: Blob download (works on web and inside Capacitor webview)
const downloadJsonAsFile = (backupJson: string, fileName: string) => {
  const blob = new Blob([backupJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Folder-based backup system that creates customer folders with bill PDFs
export const createFolderBasedBackup = async () => {
  try {
    const customers = getCustomers();

    console.log('Starting folder-based backup for', customers.length, 'customers');

    // Check if there's any data to backup
    if (customers.length === 0) {
      return {
        success: false,
        message: 'No customers found to backup. Please add some customers first.',
        error: 'NO_CUSTOMERS'
      };
    }

    const mainFolderName = `BillBuddyBackup_${new Date().toISOString().slice(0, 10)}`;
    let totalPDFsGenerated = 0;
    let customersProcessed = 0;

    // Process each customer
    for (const customer of customers) {
      try {
        const customerBills = getBillsByCustomer(customer.id);

        if (customerBills.length === 0) {
          console.log(`No bills found for customer: ${customer.name}`);
          continue;
        }

        // Sanitize customer name for folder creation
        const safeCustomerName = customer.name.replace(/[^a-zA-Z0-9-_]/g, '_') || 'UnknownCustomer';
        const customerFolderPath = `${mainFolderName}/${safeCustomerName}`;

        // Create customer folder
        try {
          // First ensure main backup folder exists
          try {
            await Filesystem.mkdir({
              path: mainFolderName,
              directory: 'DOCUMENTS' as Directory,
              recursive: true,
            });
          } catch (mainFolderError) {
            console.log('Main folder check:', mainFolderError);
          }

          await Filesystem.mkdir({
            path: customerFolderPath,
            directory: 'DOCUMENTS' as Directory,
            recursive: true,
          });
          console.log(`Created folder: ${customerFolderPath}`);
        } catch (folderError) {
          console.warn(`Folder might already exist: ${customerFolderPath}`, folderError);
        }

        // Generate PDFs for each bill
        let customerPDFsGenerated = 0;
        for (const bill of customerBills) {
          try {
            // Generate bill PDF (this will automatically save to customer folder)
            const pdfResult = await generateBillPDF(bill);

            if (pdfResult.success) {
              customerPDFsGenerated++;
              totalPDFsGenerated++;
              console.log(`Generated PDF for bill ${bill.id} in ${customer.name}'s folder`);
            } else {
              console.error(`Failed to generate PDF for bill ${bill.id}:`, pdfResult.message);
            }
          } catch (pdfError) {
            console.error(`Error generating PDF for bill ${bill.id}:`, pdfError);
          }
        }

        customersProcessed++;
        console.log(`Processed customer ${customer.name}: ${customerPDFsGenerated} PDFs generated`);

      } catch (customerError) {
        console.error(`Error processing customer ${customer.name}:`, customerError);
      }
    }

    // Get the URI of the main backup folder for sharing
    let shareUri = null;
    try {
      const folderInfo = await Filesystem.getUri({
        path: mainFolderName,
        directory: 'DOCUMENTS' as Directory
      });
      shareUri = folderInfo.uri;
    } catch (uriError) {
      console.warn('Could not get folder URI for sharing:', uriError);
    }

    // Share the backup folder
    if (shareUri && Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: 'Bill Buddy Folder Backup',
          text: `Backup created with ${customersProcessed} customer folders containing ${totalPDFsGenerated} bill PDFs`,
          url: shareUri,
          dialogTitle: 'Share Backup Folder'
        });
      } catch (shareError) {
        console.warn('Could not share backup folder:', shareError);
      }
    }

    return {
      success: true,
      message: `Folder-based backup created successfully! Generated ${totalPDFsGenerated} PDFs across ${customersProcessed} customer folders.`,
      folderName: mainFolderName,
      summary: {
        customersProcessed,
        totalPDFsGenerated,
        mainFolderPath: mainFolderName
      }
    };

  } catch (error) {
    console.error('Folder-based backup creation error:', error);
    return {
      success: false,
      message: 'Failed to create folder-based backup',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// Comprehensive backup system that includes all customer data, bills, payments, and last balance PDFs
export const createComprehensiveBackup = async () => {
  try {
    const customers = getCustomers();
    const bills = getBills();
    const payments = getPayments();
    const items = getItems();
    const customerBalances = getAllCustomerBalances();

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

    // Generate last balance PDFs for all customers
    console.log('Generating last balance PDFs for all customers...');
    const pdfPromises = customers.map(async (customer) => {
      try {
        const pdfResult = await generateLastBalancePDF(customer.id, customer.name);
        return {
          customerId: customer.id,
          customerName: customer.name,
          pdfData: pdfResult.success ? pdfResult.filePath || 'Generated' : null,
          error: pdfResult.success ? null : pdfResult.message
        };
      } catch (error) {
        console.error(`Failed to generate PDF for ${customer.name}:`, error);
        return {
          customerId: customer.id,
          customerName: customer.name,
          pdfData: null,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    const pdfResults = await Promise.all(pdfPromises);
    console.log('PDF generation completed for all customers');

    // Structure the comprehensive backup data
    const data = {
      customers: customers.map(customer => ({
        id: customer.id,
        name: customer.name,
        createdAt: customer.createdAt,
        // Include all bills for this customer with detailed item information
        bills: bills.filter((bill: any) => bill.customerId === customer.id).map((bill: any) => ({
          id: bill.id,
          date: bill.date,
          items: bill.items.map((item: any) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            rate: item.rate,
            total: item.total
          })),
          grandTotal: bill.grandTotal,
          createdAt: bill.createdAt
        })),
        // Include all payments for this customer
        payments: payments.filter(payment => payment.customerId === customer.id).map(payment => ({
          id: payment.id,
          amount: payment.amount,
          date: payment.date,
          createdAt: payment.createdAt
        })),
        // Include balance information
        balance: customerBalances.find(balance => balance.customerId === customer.id) || {
          totalSales: 0,
          totalPaid: 0,
          pending: 0
        }
      })),
      items, // Master items list
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      pdfs: pdfResults, // PDF generation results
      summary: {
        customerCount: customers.length,
        billCount: bills.length,
        paymentCount: payments.length,
        itemCount: items.length,
        pdfsGenerated: pdfResults.filter(pdf => pdf.pdfData).length
      }
    };

    console.log('Comprehensive backup data prepared:', data); // Debug log

    const backupJson = JSON.stringify(data, null, 2);
    const fileName = `billbuddy_comprehensive_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

    console.log('Backup JSON length:', backupJson.length); // Debug log
    console.log('Backup contains data for:', data.summary); // Debug log

    // Handle platform-specific backup creation
    try {
      if (Capacitor.getPlatform() === 'web') {
        // Web: blob download
        downloadJsonAsFile(backupJson, fileName);
      } else {
        // Native: try Filesystem + Share, fall back to blob download if plugin missing
        try {
          const backupDir = 'BillBuddyBackups';
          try {
            await Filesystem.mkdir({
              path: backupDir,
              directory: 'DOCUMENTS' as Directory,
              recursive: true
            });
          } catch (mkdirErr) {
            console.log('Backup directory check:', mkdirErr);
          }

          const base64Data = btoa(unescape(encodeURIComponent(backupJson)));
          const filePath = `${backupDir}/${fileName}`;

          await Filesystem.writeFile({
            path: filePath,
            data: base64Data,
            directory: 'DOCUMENTS' as Directory
          });

          const fileUri = await Filesystem.getUri({
            directory: 'DOCUMENTS' as Directory,
            path: filePath
          });

          await Share.share({
            title: 'Bill Buddy Comprehensive Backup',
            text: `Complete backup with ${customers.length} customers, ${bills.length} bills, ${payments.length} payments, and ${pdfResults.filter(p => p.pdfData).length} balance PDFs`,
            url: fileUri.uri,
            dialogTitle: 'Save or Share Backup'
          });
        } catch (nativeError) {
          console.warn('Native comprehensive backup failed, falling back to blob download:', nativeError);
          downloadJsonAsFile(backupJson, fileName);
        }
      }

      return {
        success: true,
        message: `Comprehensive backup created successfully! Included ${customers.length} customers, ${bills.length} bills, ${payments.length} payments, and ${pdfResults.filter(p => p.pdfData).length} balance PDFs.`,
        fileName,
        summary: data.summary
      };
    } catch (error: any) {
      console.error('Comprehensive backup creation error:', error);
      return {
        success: false,
        message: `Failed to create comprehensive backup: ${error?.message || 'Unknown error'}.`,
        error: error?.message || String(error)
      };
    }
  } catch (error) {
    console.error('Comprehensive backup creation error:', error); // Debug log
    return {
      success: false,
      message: 'Failed to create comprehensive backup',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};


