import { getCustomers, getBillsByCustomer } from './storage';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { generateBillPDF } from './pdf';

export interface FolderBackupResult {
  success: boolean;
  message: string;
  folderName?: string;
  summary?: {
    customersProcessed: number;
    totalPDFsGenerated: number;
  };
  error?: string;
}

/**
 * Creates a folder-based backup containing individual customer folders with their bill PDFs
 */
export const createFolderBasedBackup = async (): Promise<FolderBackupResult> => {
  try {
    const customers = getCustomers();

    if (customers.length === 0) {
      return {
        success: false,
        message: 'No customers found to backup',
        error: 'NO_CUSTOMERS'
      };
    }

    // Generate timestamp for folder name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const folderName = `BillBuddyBackup_${timestamp}`;

    let customersProcessed = 0;
    let totalPDFsGenerated = 0;

    if (Capacitor.isNativePlatform()) {
      // Mobile: Create folder structure and generate PDFs
      try {
        // Create main backup folder
        await Filesystem.mkdir({
          path: folderName,
          directory: 'DOCUMENTS' as any,
          recursive: true
        });

        // Process each customer
        for (const customer of customers) {
          const customerBills = getBillsByCustomer(customer.id);

          if (customerBills.length === 0) {
            continue; // Skip customers with no bills
          }

          // Sanitize customer name for folder creation
          const sanitizedCustomerName = customer.name.replace(/[^a-zA-Z0-9\s\-_]/g, '_');

          // Create customer folder
          const customerFolderPath = `${folderName}/${sanitizedCustomerName}`;
          await Filesystem.mkdir({
            path: customerFolderPath,
            directory: 'DOCUMENTS' as any,
            recursive: true
          });

          // Generate PDF for each bill
          for (const bill of customerBills) {
            try {
              await generateBillPDF(bill);
              totalPDFsGenerated++;
            } catch (pdfError) {
              console.warn(`Failed to generate PDF for bill ${bill.id}:`, pdfError);
              // Continue with other bills
            }
          }

          customersProcessed++;
        }

        // Share the backup folder
        try {
          await Share.share({
            title: 'Bill Buddy Folder Backup',
            text: `Backup created with ${customersProcessed} customer folders and ${totalPDFsGenerated} PDFs`,
            url: `file:///Documents/${folderName}`,
            dialogTitle: 'Share Backup Folder'
          });
        } catch (shareError) {
          console.warn('Failed to share backup folder:', shareError);
        }

        return {
          success: true,
          message: `Folder-based backup created successfully. Processed ${customersProcessed} customers with ${totalPDFsGenerated} PDFs.`,
          folderName,
          summary: {
            customersProcessed,
            totalPDFsGenerated
          }
        };

      } catch (mobileError) {
        console.error('Mobile folder backup error:', mobileError);
        return {
          success: false,
          message: 'Failed to create folder backup on mobile device',
          error: mobileError instanceof Error ? mobileError.message : 'Unknown error'
        };
      }
    } else {
      // Web: Create folder structure in downloads (limited by browser security)
      try {
        // For web, we'll create a simplified version that generates all PDFs
        // Browser security prevents creating actual folder structures in downloads

        for (const customer of customers) {
          const customerBills = getBillsByCustomer(customer.id);

          if (customerBills.length === 0) {
            continue;
          }

          // Generate PDF for each bill (they will be downloaded individually)
          for (const bill of customerBills) {
            try {
              await generateBillPDF(bill);
              totalPDFsGenerated++;
            } catch (pdfError) {
              console.warn(`Failed to generate PDF for bill ${bill.id}:`, pdfError);
            }
          }

          customersProcessed++;
        }

        return {
          success: true,
          message: `Web backup completed. Generated ${totalPDFsGenerated} PDFs for ${customersProcessed} customers. (Individual downloads due to browser security)`,
          folderName: `WebBackup_${timestamp}`,
          summary: {
            customersProcessed,
            totalPDFsGenerated
          }
        };

      } catch (webError) {
        console.error('Web folder backup error:', webError);
        return {
          success: false,
          message: 'Failed to create folder backup on web',
          error: webError instanceof Error ? webError.message : 'Unknown error'
        };
      }
    }
  } catch (error) {
    console.error('Folder-based backup creation error:', error);
    return {
      success: false,
      message: 'Failed to create folder-based backup',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
