import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill } from '@/types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const generateCustomerSummaryPDF = async (customerId: string) => {
  const { getBillsByCustomer, getCustomerBalance } = await import('@/lib/storage');
  const bills = getBillsByCustomer(customerId);
  const balance = getCustomerBalance(customerId);
  
  if (bills.length === 0) {
    return { success: false, message: 'No bills found for this customer' };
  }

  const doc = new jsPDF();
  
  // Header - Customer Name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(balance.customerName, 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Customer Summary Report', 105, 32, { align: 'center' });
  
  // Date - Top Left
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
  
  // Bills summary table
  const tableData = bills.map((bill, index) => {
    // Get summary of items for each bill
    const itemsSummary = bill.items.map(item => `${item.itemName} (${item.quantity})`).join(', ');
    return [
      index + 1,
      new Date(bill.date).toLocaleDateString(),
      itemsSummary.length > 40 ? itemsSummary.substring(0, 40) + '...' : itemsSummary,
      `Rs. ${bill.grandTotal.toFixed(2)}`
    ];
  });
  
  autoTable(doc, {
    head: [['Sr No', 'Date', 'Items', 'Amount']],
    body: tableData,
    startY: 65,
    theme: 'grid',
    styles: {
      fontSize: 9,
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
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(pdfOutput)));
      
      await Filesystem.writeFile({
        path: `summaries/${fileName}`,
        data: base64Data,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
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
  
  // Header - Customer Name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(bill.customerName, 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Bill Receipt', 105, 32, { align: 'center' });
  
  // Date - Top Left
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(bill.date).toLocaleDateString()}`, 20, 50);
  
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
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(pdfOutput)));
      
      await Filesystem.writeFile({
        path: `bills/${fileName}`,
        data: base64Data,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
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