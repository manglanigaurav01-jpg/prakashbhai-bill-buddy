import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getBills, getPayments, getCustomers, getItems } from '@/lib/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCD-kUBQCrz7kuNYHewynw1-8blwZsQb4w",
  authDomain: "prakashbhai-bill-buddy-85123.firebaseapp.com",
  projectId: "prakashbhai-bill-buddy-85123",
  storageBucket: "prakashbhai-bill-buddy-85123.firebasestorage.app",
  messagingSenderId: "491579424292",
  appId: "1:491579424292:android:93a7e573e3498a6cdee2b1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let unsubscribeSnapshot: (() => void) | null = null;

// Auto-sync function
const setupRealtimeSync = (userId: string) => {
  // Unsubscribe from previous listener if exists
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
  }

  // Listen for remote changes
  unsubscribeSnapshot = onSnapshot(doc(db, 'users', userId), (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const lastUpdateTime = data.lastUpdate || 0;
      const localLastUpdate = localStorage.getItem('lastSyncTime') || '0';

      // Only update if remote data is newer
      if (lastUpdateTime > parseInt(localLastUpdate)) {
        localStorage.setItem('prakash_bills', JSON.stringify(data.bills || []));
        localStorage.setItem('prakash_customers', JSON.stringify(data.customers || []));
        localStorage.setItem('prakash_payments', JSON.stringify(data.payments || []));
        localStorage.setItem('prakash_items', JSON.stringify(data.items || []));
        localStorage.setItem('lastSyncTime', lastUpdateTime.toString());
        
        // Trigger UI refresh
        window.dispatchEvent(new Event('storage'));
      }
    }
  });

  // Setup local storage change listener
  const handleStorageChange = async () => {
    const currentTime = Date.now();
    const data = {
      bills: getBills(),
      customers: getCustomers(),
      payments: getPayments(),
      items: getItems(),
      lastUpdate: currentTime
    };
    
    try {
      await setDoc(doc(db, 'users', userId), data);
      localStorage.setItem('lastSyncTime', currentTime.toString());
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  // Listen for local changes
  window.addEventListener('storage', handleStorageChange);

  // Return cleanup function
  return () => {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
    window.removeEventListener('storage', handleStorageChange);
  };
};

// Auth functions
export const signUp = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    setupRealtimeSync(result.user.uid);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    setupRealtimeSync(result.user.uid);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Initialize auth state listener
export const initializeAuth = () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      setupRealtimeSync(user.uid);
    }
  });
};