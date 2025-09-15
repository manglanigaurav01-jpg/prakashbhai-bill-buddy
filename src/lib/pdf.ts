import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill } from '@/types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const formatDate = (date: Date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper function to convert arraybuffer to base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const generateCustomerSummaryPDF = async (customerId: string) => {
  const { getBillsByCustomer, getCustomerBalance, getPayments } = await import('@/lib/storage');
  const bills = getBillsByCustomer(customerId);
  const balance = getCustomerBalance(customerId);
  const payments = getPayments().filter(payment => payment.customerId === customerId);
  
  if (bills.length === 0) {
    return { success: false, message: 'No bills found for this customer' };
  }

  const doc = new jsPDF();
  
  // Header - Customer Name (top, large font)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(balance.customerName, 20, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Customer Summary Report', 20, 32);
  
  // Date - Top Left (increased font size)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(new Date())}`, 20, 50);
  
  // Prepare table data with payment information
  const tableData = [];
  
  // Sort bills and payments chronologically and assign each payment at most once
  const billsSorted = [...bills].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const paymentsSorted = [...payments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  let paymentIndex = 0;

  billsSorted.forEach((bill, index) => {
    // Get summary of items for each bill
    const itemsSummary = bill.items.map(item => `${item.itemName} (${item.quantity})`).join(', ');

    // Consume at most one unmatched payment sequentially (prevents duplicates across bills)
    let date2 = '-';
    let jama = '-';
    if (paymentIndex < paymentsSorted.length) {
      const payment = paymentsSorted[paymentIndex++];
      date2 = formatDate(new Date(payment.date));
      jama = `Rs. ${payment.amount.toFixed(2)}`;
    }

    tableData.push([
      index + 1,
      formatDate(new Date(bill.date)),
      itemsSummary.length > 30 ? itemsSummary.substring(0, 30) + '...' : itemsSummary,
      `Rs. ${bill.grandTotal.toFixed(2)}`,
      date2,
      jama
    ]);
  });
  
  autoTable(doc, {
    head: [['Sr No', 'Date1', 'Item Name', 'Total', 'Date2', 'Jama']],
    body: tableData,
    startY: 65,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [52, 73, 190],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    tableLineWidth: 0.1,
    showHead: 'everyPage',
    pageBreak: 'auto',
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 }, // Sr No
      1: { cellWidth: 22 }, // Date1
      2: { cellWidth: 35 }, // Item Name
      3: { halign: 'right', cellWidth: 20 }, // Total
      4: { cellWidth: 22 }, // Date2
      5: { halign: 'right', cellWidth: 20 }, // Jama
    },
  });
  
  // Summary section
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 20, finalY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryY = finalY + 10;
  doc.text(`Total Sales: Rs. ${balance.totalSales.toFixed(2)}`, 20, summaryY);
  doc.text(`Total Paid: Rs. ${balance.totalPaid.toFixed(2)}`, 20, summaryY + 10);
  
  if (balance.pending > 0) {
    doc.setTextColor(255, 0, 0); // Red for pending
    doc.text(`Pending Amount: Rs. ${balance.pending.toFixed(2)}`, 20, summaryY + 20);
  } else if (balance.pending < 0) {
    doc.setTextColor(0, 128, 0); // Green for advance
    doc.text(`Advance Amount: Rs. ${Math.abs(balance.pending).toFixed(2)}`, 20, summaryY + 20);
  } else {
    doc.setTextColor(0, 128, 0); // Green for cleared
    doc.text('Payment Status: Cleared', 20, summaryY + 20);
  }
  
  // Reset color for footer
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, doc.internal.pageSize.height - 20, { align: 'center' });
  
  // Save the PDF
  const fileName = `${balance.customerName}_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
  
  try {
    if (Capacitor.isNativePlatform()) {
      const pdfOutput = doc.output('arraybuffer');
      const base64Data = arrayBufferToBase64(pdfOutput);
      
      await Filesystem.writeFile({
        path: `summaries/${fileName}`,
        data: base64Data,
        directory: Directory.Documents,
      });
      
      return { success: true, message: 'Summary saved to Documents/summaries folder' };
    } else {
      doc.save(fileName);
      return { success: true, message: 'Summary downloaded successfully' };
    }
  } catch (error) {
    console.error('Error saving PDF:', error);
    return { success: false, message: 'Failed to save summary PDF. Please try again.' };
  }
};

export const generateBillPDF = async (bill: Bill) => {
  const doc = new jsPDF();
  
  // Header - Customer Name (top, large font)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(bill.customerName, 20, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Bill Receipt', 20, 32);
  
  // Date - Top Left (increased font size)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(new Date(bill.date))}`, 20, 50);
  
  if (bill.particulars) {
    doc.setFontSize(10);
    doc.text(`Particulars: ${bill.particulars}`, 20, 60);
  }
  
  // Items table
  const tableData = bill.items.map((item, index) => [
    index + 1,
    item.itemName,
    item.quantity.toString(),
    `Rs. ${item.rate.toFixed(2)}`,
    `Rs. ${item.total.toFixed(2)}`
  ]);
  
  autoTable(doc, {
    head: [['Sr No', 'Item Name', 'Quantity', 'Rate', 'Total']],
    body: tableData,
    startY: bill.particulars ? 70 : 60,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [52, 73, 190],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    tableLineWidth: 0.1,
    showHead: 'everyPage',
    pageBreak: 'auto',
  });
  
  // Grand total
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total: Rs. ${bill.grandTotal.toFixed(2)}`, 20, finalY);
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, doc.internal.pageSize.height - 20, { align: 'center' });
  
  // Save the PDF
  const fileName = `${bill.customerName}_${new Date(bill.date).toISOString().split('T')[0]}_${bill.id}.pdf`;
  
  try {
    if (Capacitor.isNativePlatform()) {
      // Mobile: Use Capacitor Filesystem API
      const pdfOutput = doc.output('arraybuffer');
      const base64Data = arrayBufferToBase64(pdfOutput);
      
      await Filesystem.writeFile({
        path: `bills/${fileName}`,
        data: base64Data,
        directory: Directory.Documents,
      });
      
      return { success: true, message: 'Bill saved to Documents/bills folder' };
    } else {
      // Web: Use browser download
      doc.save(fileName);
      return { success: true, message: 'Bill downloaded successfully' };
    }
  } catch (error) {
    console.error('Error saving PDF:', error);
    return { success: false, message: 'Failed to save PDF. Please try again.' };
  }
};