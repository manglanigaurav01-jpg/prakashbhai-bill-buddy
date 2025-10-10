import { create } from 'zustand';

interface SyncState {
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  errorMessage: string | null;
  hasNetworkConnection: boolean;
  setLastSync: (time: string) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void;
  setErrorMessage: (message: string | null) => void;
  setNetworkConnection: (status: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  lastSync: null,
  syncStatus: 'idle',
  errorMessage: null,
  hasNetworkConnection: true,
  setLastSync: (time) => set({ lastSync: time }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  setNetworkConnection: (status) => set({ hasNetworkConnection: status }),
}));

// Network status monitoring
export const initNetworkMonitoring = () => {
  const updateNetworkStatus = () => {
    useSyncStore.getState().setNetworkConnection(navigator.onLine);
  };

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);

  // Initial check
  updateNetworkStatus();

  return () => {
    window.removeEventListener('online', updateNetworkStatus);
    window.removeEventListener('offline', updateNetworkStatus);
  };
};