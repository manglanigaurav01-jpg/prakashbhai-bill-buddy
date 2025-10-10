import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill, CustomerBalance, MonthlyBalance } from '@/types';
import { startOfMonth, endOfMonth, subMonths, format, isSameMonth } from 'date-fns';
import { generateMonthlyBalances } from './monthly-balance';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { getCustomerBalance, getBillsByCustomer } from './storage';

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const generateLastBalancePDF = async (customerId: string, customerName: string) => {
  // Get all monthly balances
  const monthlyBalances = await generateMonthlyBalances(customerId);
  
  // Get the current date and determine the month to show
  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const previousMonthEnd = subMonths(monthEnd, 1);
  
  // Find previous month's balance for opening balance
  const previousMonthBalance = monthlyBalances.find(
    balance => 
      balance.month === format(previousMonthEnd, 'MMMM') && 
      balance.year === previousMonthEnd.getFullYear()
  );
  
  // Get all bills for the current month only
  const bills = (await getBillsByCustomer(customerId)).filter(bill => {
    const billDate = new Date(bill.date);
    return billDate >= monthStart && billDate <= monthEnd;
  });

  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(customerName, 20, 20);

  doc.setFontSize(14);
  doc.text('Last Balance Statement', 20, 30);

  doc.setFontSize(12);
  doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 40);

  // Table data
  const tableData: any[] = [];

  // Add previous month's closing balance as opening balance
  const openingBalance = previousMonthBalance?.closingBalance || 0;
  tableData.push([
    format(monthStart, 'dd/MM/yyyy'),
    'Opening Balance',
    '-',
    '-',
    `Rs. ${openingBalance.toFixed(2)}`,
    openingBalance.toFixed(2)
  ]);

  // Sort bills by date
  bills.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Running balance starting from opening balance
  let runningBalance = openingBalance;

  // Add current month's bills
  bills.forEach(bill => {
    bill.items.forEach(item => {
      runningBalance += item.rate * item.quantity;
      tableData.push([
        format(new Date(bill.date), 'dd/MM/yyyy'),
        item.itemName,
        item.quantity.toString(),
        item.rate.toFixed(2),
        (item.rate * item.quantity).toFixed(2),
        runningBalance.toFixed(2)
      ]);
    });
  });

  // Generate table
  autoTable(doc, {
    head: [['Date', 'Particulars', 'Qty', 'Rate', 'Amount', 'Balance']],
    body: tableData,
    startY: 50,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [52, 73, 190], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 25 }, // Date
      1: { cellWidth: 50 }, // Particulars
      2: { cellWidth: 20, halign: 'right' }, // Qty
      3: { cellWidth: 25, halign: 'right' }, // Rate
      4: { cellWidth: 30, halign: 'right' }, // Amount
      5: { cellWidth: 30, halign: 'right' }, // Balance
    },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Current Balance: Rs. ${runningBalance.toFixed(2)}`, 20, finalY);

  try {
    // Generate PDF data
    const pdfOutput = doc.output('arraybuffer');
    const base64Data = arrayBufferToBase64(pdfOutput);
    const fileName = `${customerName.replace(/\s+/g, '_')}_last_balance_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    if (Capacitor.getPlatform() === 'web') {
      // For web, create a download link
      const blob = new Blob([pdfOutput], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      return { success: true, message: 'PDF downloaded successfully' };
    } else {
      // For mobile platforms
      try {
        // First, ensure the directory exists
        const dirResult = await Filesystem.mkdir({
          path: 'bill_buddy_pdfs',
          directory: Directory.Documents,
          recursive: true
        });

        // Save the file to the device
        const fullPath = `bill_buddy_pdfs/${fileName}`;
        const savedFile = await Filesystem.writeFile({
          path: fullPath,
          data: base64Data,
          directory: Directory.Documents
        });

        // Get the complete file URI for sharing
        const fileInfo = await Filesystem.getUri({
          path: fullPath,
          directory: Directory.Documents
        });

        if (!fileInfo.uri) {
          throw new Error('Could not get file URI');
        }

        // Share the PDF
        await Share.share({
          title: 'Last Balance PDF',
          text: `Last Balance Statement for ${customerName}`,
          url: fileInfo.uri,
          dialogTitle: 'Share Last Balance PDF'
        });

        return { 
          success: true, 
          message: 'PDF saved and shared successfully', 
          filePath: fileInfo.uri 
        };
      } catch (err) {
        console.error('Mobile PDF handling error:', err);
        throw new Error(err instanceof Error ? err.message : 'Failed to save or share PDF');
      }
    }
  } catch (error) {
    console.error('Error handling PDF:', error);
    throw new Error('Failed to process PDF: ' + (error.message || 'Unknown error'));
  }
};