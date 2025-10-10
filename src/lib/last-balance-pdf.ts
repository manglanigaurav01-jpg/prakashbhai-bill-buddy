import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill, CustomerBalance, MonthlyBalance } from '@/types';
import { startOfMonth, endOfMonth, subMonths, format, isSameMonth } from 'date-fns';
import { generateMonthlyBalances } from './monthly-balance';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
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
  // Get current month and last month's balances
  const monthlyBalances = await generateMonthlyBalances(customerId);
  const currentMonth = new Date();
  const lastMonth = subMonths(currentMonth, 1);
  
  // Find last month's balance
  const lastMonthBalance = monthlyBalances.find(
    balance => balance.month === format(lastMonth, 'MMMM') && balance.year === lastMonth.getFullYear()
  );
  
  // Get bills for the current month
  const bills = (await getBillsByCustomer(customerId)).filter(bill => 
    isSameMonth(new Date(bill.date), currentMonth)
  );

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

  // Add last month's closing balance as first row
  if (lastMonthBalance) {
    tableData.push([
      format(lastMonth, 'dd/MM/yyyy'),
      'Last Balance',
      '-',
      '-',
      `Rs. ${lastMonthBalance.closingBalance.toFixed(2)}`,
      lastMonthBalance.closingBalance.toFixed(2)
    ]);
  }

  // Get current month's bills
  const currentMonthBills = bills;

  // Sort bills by date
  currentMonthBills.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Running balance starting from last month's closing balance
  let runningBalance = lastMonthBalance?.closingBalance || 0;

  // Add current month's bills
  currentMonthBills.forEach(bill => {
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

  // Save or return the PDF
  if (Capacitor.getPlatform() === 'web') {
    doc.save(`${customerName}_last_balance.pdf`);
    return { success: true, message: 'PDF generated successfully' };
  } else {
    const pdfOutput = doc.output('arraybuffer');
    const data = arrayBufferToBase64(pdfOutput);
    const fileName = `${customerName.replace(/\s+/g, '_')}_last_balance_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    try {
      await Filesystem.writeFile({
        path: fileName,
        data: data,
        directory: Directory.Documents
      });
      return { success: true, message: 'PDF saved successfully', filePath: fileName };
    } catch (error) {
      console.error('Error saving PDF:', error);
      return { success: false, message: 'Failed to save PDF' };
    }
  }
};