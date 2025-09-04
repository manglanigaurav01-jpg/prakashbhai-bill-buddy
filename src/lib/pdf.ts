import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill } from '@/types';

export const generateBillPDF = (bill: Bill) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Prakashbhai', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Bill Manager', 105, 30, { align: 'center' });
  
  // Bill details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 20, 50);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bill ID: ${bill.id}`, 20, 60);
  doc.text(`Date: ${new Date(bill.date).toLocaleDateString()}`, 20, 70);
  doc.text(`Customer: ${bill.customerName}`, 20, 80);
  if (bill.particulars) {
    doc.text(`Particulars: ${bill.particulars}`, 20, 90);
  }
  
  // Items table
  const tableData = bill.items.map((item, index) => [
    index + 1,
    item.itemName,
    item.quantity.toString(),
    `₹${item.rate.toFixed(2)}`,
    `₹${item.total.toFixed(2)}`
  ]);
  
  autoTable(doc, {
    head: [['Sr No', 'Item Name', 'Quantity', 'Rate', 'Total']],
    body: tableData,
    startY: bill.particulars ? 100 : 90,
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
  doc.text(`Grand Total: ₹${bill.grandTotal.toFixed(2)}`, 20, finalY);
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, doc.internal.pageSize.height - 20, { align: 'center' });
  
  // Save the PDF
  const fileName = `${bill.customerName}_${new Date(bill.date).toISOString().split('T')[0]}_${bill.id}.pdf`;
  doc.save(fileName);
};