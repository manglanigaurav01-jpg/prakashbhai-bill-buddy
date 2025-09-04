import { BillItem } from '@/types';

export interface BillDraft {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  particulars: string;
  items: BillItem[];
  grandTotal: number;
  lastSaved: string;
}

const DRAFT_STORAGE_KEY = 'prakash_bill_draft';
const DRAFT_AUTO_SAVE_INTERVAL = 5000; // 5 seconds

// Auto-save draft functionality
export const saveDraft = (draft: Omit<BillDraft, 'id' | 'lastSaved'>) => {
  const billDraft: BillDraft = {
    ...draft,
    id: 'current_draft',
    lastSaved: new Date().toISOString(),
  };
  
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(billDraft));
  return billDraft;
};

export const getDraft = (): BillDraft | null => {
  const data = localStorage.getItem(DRAFT_STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const clearDraft = () => {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
};

export const hasDraft = (): boolean => {
  return localStorage.getItem(DRAFT_STORAGE_KEY) !== null;
};

// Auto-save hook utility
export const useAutoSave = (
  data: Omit<BillDraft, 'id' | 'lastSaved'>,
  enabled: boolean = true
) => {
  if (!enabled) return;
  
  const timeoutId = setTimeout(() => {
    if (data.items.length > 0 || data.particulars || data.customerId) {
      saveDraft(data);
    }
  }, DRAFT_AUTO_SAVE_INTERVAL);

  return () => clearTimeout(timeoutId);
};