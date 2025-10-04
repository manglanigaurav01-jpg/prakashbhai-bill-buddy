import { Bill, Payment } from '@/types';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export const shareViaWhatsApp = async (phoneNumber: string, message: string, fileUrl?: string) => {
  try {
    // Format phone number (remove non-digits)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (Capacitor.isNativePlatform()) {
      // Native WhatsApp share
      await Share.share({
        text: message,
        url: fileUrl,
        dialogTitle: 'Share via WhatsApp',
      });
    } else {
      // Web WhatsApp
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    }
    
    return { success: true, message: 'Opened WhatsApp successfully' };
  } catch (error) {
    console.error('WhatsApp share error:', error);
    return { success: false, message: 'Failed to open WhatsApp' };
  }
};

export const createBillMessage = (bill: Bill): string => {
  const itemsList = bill.items
    .map((item, idx) => `${idx + 1}. ${item.itemName} - Qty: ${item.quantity} @ ₹${item.rate} = ₹${item.total}`)
    .join('\n');
  
  let message = `📄 *Bill from Prakash Bhai Bill Buddy*\n\n`;
  message += `Customer: ${bill.customerName}\n`;
  message += `Date: ${new Date(bill.date).toLocaleDateString('en-IN')}\n`;
  if (bill.particulars) {
    message += `Details: ${bill.particulars}\n`;
  }
  message += `\n*Items:*\n${itemsList}\n\n`;
  
  if (bill.discount) {
    const discountAmount = bill.discountType === 'percentage' 
      ? (bill.items.reduce((sum, item) => sum + item.total, 0) * bill.discount / 100)
      : bill.discount;
    message += `Discount: ${bill.discountType === 'percentage' ? `${bill.discount}%` : `₹${bill.discount}`} = ₹${discountAmount.toFixed(2)}\n`;
  }
  
  message += `\n*Grand Total: ₹${bill.grandTotal.toFixed(2)}*\n\n`;
  message += `Thank you for your business! 🙏`;
  
  return message;
};

export const createPaymentReminderMessage = (customerName: string, pendingAmount: number): string => {
  return `🔔 *Payment Reminder*\n\nDear ${customerName},\n\nThis is a friendly reminder that you have a pending payment of *₹${pendingAmount.toFixed(2)}*.\n\nPlease make the payment at your earliest convenience.\n\nThank you! 🙏\n\n- Prakash Bhai Bill Buddy`;
};

export const createPaymentConfirmationMessage = (payment: Payment): string => {
  return `✅ *Payment Received*\n\nDear ${payment.customerName},\n\nWe have received your payment of *₹${payment.amount.toFixed(2)}*\n\nDate: ${new Date(payment.date).toLocaleDateString('en-IN')}\n${payment.paymentMethod ? `Method: ${payment.paymentMethod}` : ''}\n\nThank you for your payment! 🙏\n\n- Prakash Bhai Bill Buddy`;
};
