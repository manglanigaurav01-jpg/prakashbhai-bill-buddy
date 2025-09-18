import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill, CustomerBalance } from '@/types';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const formatDate = (date: Date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

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

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(new Date())}`, 20, 50);

  const tableData: any[] = [];

  const normalizeDate = (value: string | Date): string => {
    const d = value instanceof Date ? value : new Date(value);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };

  const billsByDate = new Map<string, typeof bills>();
  bills.forEach(bill => {
    const key = normalizeDate(bill.date);
    const list = billsByDate.get(key) || [];
    list.push(bill);
    billsByDate.set(key, list);
  });

  const paymentsByDate = new Map<string, typeof payments>();
  payments.forEach(payment => {
    const key = normalizeDate(payment.date);
    const list = paymentsByDate.get(key) || [];
    list.push(payment);
    paymentsByDate.set(key, list);
  });

  const allDates = Array.from(new Set([...billsByDate.keys(), ...paymentsByDate.keys()]))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  let rowIndex = 1;
  allDates.forEach(dateKey => {
    const dayBills = billsByDate.get(dateKey) || [];
    const dayPayments = paymentsByDate.get(dateKey) || [];
    const maxLen = Math.max(dayBills.length, dayPayments.length);

    for (let i = 0; i < maxLen; i++) {
      const bill = dayBills[i];
      const payment = dayPayments[i];

      const date1 = bill ? formatDate(new Date(bill.date)) : '-';
      const itemsSummary = bill ? bill.items.map(item => `${item.itemName} (${item.quantity})`).join(', ') : '';
      const trimmedItems = itemsSummary ? (itemsSummary.length > 30 ? itemsSummary.substring(0, 30) + '...' : itemsSummary) : '';
      const total = bill ? `Rs. ${bill.grandTotal.toFixed(2)}` : '';
      const date2 = payment ? formatDate(new Date(payment.date)) : '-';
      const jama = payment ? `Rs. ${payment.amount.toFixed(2)}` : '-';

      tableData.push([
        rowIndex++,
        date1,
        trimmedItems,
        total || '-',
        date2,
        jama
      ]);
    }
  });

  autoTable(doc, {
    head: [['Sr No', 'Date1', 'Item Name', 'Total', 'Date2', 'Jama']],
    body: tableData,
    startY: 65,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [52, 73, 190], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    tableLineWidth: 0.1,
    showHead: 'everyPage',
    pageBreak: 'auto',
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 22 },
      2: { cellWidth: 35 },
      3: { halign: 'right', cellWidth: 20 },
      4: { cellWidth: 22 },
      5: { halign: 'right', cellWidth: 20 },
    },
  });

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
    doc.setTextColor(255, 0, 0);
    doc.text(`Pending Amount: Rs. ${balance.pending.toFixed(2)}`, 20, summaryY + 20);
  } else if (balance.pending < 0) {
    doc.setTextColor(0, 128, 0);
    doc.text(`Advance Amount: Rs. ${Math.abs(balance.pending).toFixed(2)}`, 20, summaryY + 20);
  } else {
    doc.setTextColor(0, 128, 0);
    doc.text('Payment Status: Cleared', 20, summaryY + 20);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, doc.internal.pageSize.height - 20, { align: 'center' });

  const fileName = `${balance.customerName}_Summary_${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    if (Capacitor.isNativePlatform()) {
      const pdfOutput = doc.output('arraybuffer');
      const base64Data = arrayBufferToBase64(pdfOutput);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      });

      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: 'Customer Summary PDF',
        text: `Summary for ${balance.customerName}`,
        url: fileUri.uri,
        dialogTitle: 'Save or Share PDF'
      });

      return { success: true, message: 'PDF ready - choose where to save it!' };
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

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(bill.customerName, 20, 20);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Bill Receipt', 20, 32);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(new Date(bill.date))}`, 20, 50);

  if (bill.particulars) {
    doc.setFontSize(10);
    doc.text(`Particulars: ${bill.particulars}`, 20, 60);
  }

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
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [52, 73, 190], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    tableLineWidth: 0.1,
    showHead: 'everyPage',
    pageBreak: 'auto',
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total: Rs. ${bill.grandTotal.toFixed(2)}`, 20, finalY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, doc.internal.pageSize.height - 20, { align: 'center' });

  const fileName = `${bill.customerName}_${new Date(bill.date).toISOString().split('T')[0]}_${bill.id}.pdf`;

  try {
    if (Capacitor.isNativePlatform()) {
      const pdfOutput = doc.output('arraybuffer');
      const base64Data = arrayBufferToBase64(pdfOutput);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      });

      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: 'Bill PDF',
        text: `Bill for ${bill.customerName}`,
        url: fileUri.uri,
        dialogTitle: 'Save or Share PDF'
      });

      return { success: true, message: 'PDF ready - choose where to save it!' };
    } else {
      doc.save(fileName);
      return { success: true, message: 'Bill downloaded successfully' };
    }
  } catch (error) {
    console.error('Error saving PDF:', error);
    return { success: false, message: 'Failed to save PDF. Please try again.' };
  }
};

export const generatePendingPDF = async (pendingCustomers: CustomerBalance[], totalPending: number) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Pending Amounts Report', 20, 20);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(new Date())}`, 20, 35);

  const tableData = pendingCustomers.map((customer, index) => [
    index + 1,
    customer.customerName,
    `Rs. ${customer.pending.toFixed(2)}`
  ]);

  autoTable(doc, {
    head: [['Sr No', 'Customer Name', 'Pending Amount']],
    body: tableData,
    startY: 50,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [52, 73, 190], textColor: 255, fontStyle: 'bold' },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Pending: Rs. ${totalPending.toFixed(2)}`, 20, finalY);

  const fileName = `Pending_Amounts_${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    if (Capacitor.isNativePlatform()) {
      const pdfOutput = doc.output('arraybuffer');
      const base64Data = arrayBufferToBase64(pdfOutput);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      });

      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: 'Pending Amounts Report',
        text: `Pending amounts report generated on ${formatDate(new Date())}`,
        url: fileUri.uri,
        dialogTitle: 'Save or Share PDF'
      });

      return { success: true, message: 'PDF ready - choose where to save it!' };
    } else {
      doc.save(fileName);
      return { success: true, message: 'Pending amounts report downloaded successfully' };
    }
  } catch (error) {
    console.error('Error saving PDF:', error);
    return { success: false, message: 'Failed to save pending amounts report. Please try again.' };
  }
};

export const generateAdvancePDF = async (advanceCustomers: CustomerBalance[], totalAdvance: number) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Advance Amounts Report', 20, 20);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(new Date())}`, 20, 35);

  const tableData = advanceCustomers.map((customer, index) => [
    index + 1,
    customer.customerName,
    `Rs. ${Math.abs(customer.pending).toFixed(2)}`
  ]);

  autoTable(doc, {
    head: [['Sr No', 'Customer Name', 'Advance Amount']],
    body: tableData,
    startY: 50,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [52, 73, 190], textColor: 255, fontStyle: 'bold' },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Advance: Rs. ${totalAdvance.toFixed(2)}`, 20, finalY);

  const fileName = `Advance_Amounts_${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    if (Capacitor.isNativePlatform()) {
      const pdfOutput = doc.output('arraybuffer');
      const base64Data = arrayBufferToBase64(pdfOutput);

      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      });

      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: 'Advance Amounts Report',
        text: `Advance amounts report generated on ${formatDate(new Date())}`,
        url: fileUri.uri,
        dialogTitle: 'Save or Share PDF'
      });

      return { success: true, message: 'PDF ready - choose where to save it!' };
    } else {
      doc.save(fileName);
      return { success: true, message: 'Advance amounts report downloaded successfully' };
    }
  } catch (error) {
    console.error('Error saving PDF:', error);
    return { success: false, message: 'Failed to save advance amounts report. Please try again.' };
  }
};
