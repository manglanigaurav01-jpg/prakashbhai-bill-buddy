import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill } from '@/types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const generateBillPDF = async (bill: Bill) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Prakashbhai', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Bill Manager', 105, 30, { align: 'center' });
  
  // Bill details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(bill.date).toLocaleDateString()}`, 20, 50);
  doc.text(`Customer: ${bill.customerName}`, 20, 60);
  if (bill.particulars) {
    doc.text(`Particulars: ${bill.particulars}`, 20, 70);
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
    startY: bill.particulars ? 80 : 70,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [52, 73, 190], // Primary blue color
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
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