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
const DRAFT_AUTO_SAVE_INTERVAL = 30000; // 30 seconds (reduced frequency)
const DRAFT_HISTORY_KEY = 'prakash_bill_draft_history';
const MAX_DRAFT_HISTORY = 10;

// Auto-save draft functionality with history
export const saveDraft = (draft: Omit<BillDraft, 'id' | 'lastSaved'>) => {
  const billDraft: BillDraft = {
    ...draft,
    id: 'current_draft',
    lastSaved: new Date().toISOString(),
  };
  
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(billDraft));
  
  // Save to history
  const history = getDraftHistory();
  history.unshift(billDraft);
  if (history.length > MAX_DRAFT_HISTORY) {
    history.pop();
  }
  localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(history));
  
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

export const getDraftHistory = (): BillDraft[] => {
  try {
    const data = localStorage.getItem(DRAFT_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const restoreDraftFromHistory = (draftId: string): BillDraft | null => {
  const history = getDraftHistory();
  const draft = history.find(d => d.id === draftId);
  if (draft) {
    saveDraft(draft);
    return draft;
  }
  return null;
};

// Enhanced auto-save hook with React
import { useEffect, useRef } from 'react';

export const useAutoSave = (
  data: Omit<BillDraft, 'id' | 'lastSaved'>,
  enabled: boolean = true
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  
  useEffect(() => {
    if (!enabled) return;
    
    // Only save if there's meaningful data
    const hasData = data.items.length > 0 || data.particulars || data.customerId;
    if (!hasData) return;
    
    // Create a hash to detect changes
    const dataHash = JSON.stringify(data);
    if (dataHash === lastSavedRef.current) return; // No changes
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      try {
        saveDraft(data);
        lastSavedRef.current = dataHash;
        console.log('Draft auto-saved');
      } catch (error) {
        console.error('Failed to auto-save draft:', error);
      }
    }, DRAFT_AUTO_SAVE_INTERVAL);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled]);
};