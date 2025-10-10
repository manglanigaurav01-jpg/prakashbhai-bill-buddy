import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut as fbSignOut, type Auth, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { FIREBASE_FALLBACK_CONFIG } from './firebase.local.config';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  googleProvider: GoogleAuthProvider;
}

let services: FirebaseServices | null = null;

export const initFirebase = (): FirebaseServices | null => {
  if (services) return services;
  
  // Use the main Firebase config
  const config = {
    apiKey: "AIzaSyCD-kUBQCrz7kuNYHewynw1-8blwZsQb4w",
    authDomain: "prakashbhai-bill-buddy-85123.firebaseapp.com",
    projectId: "prakashbhai-bill-buddy-85123",
    storageBucket: "prakashbhai-bill-buddy-85123.firebasestorage.app",
    messagingSenderId: "491579424292",
    appId: "1:491579424292:android:93a7e573e3498a6cdee2b1"
  };

  const app = getApps().length ? getApps()[0] : initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const googleProvider = new GoogleAuthProvider();
  
  // Configure Google provider for better compatibility
  googleProvider.addScope('email');
  googleProvider.addScope('profile');
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  
  services = { app, auth, db, googleProvider };
  return services;
};

export const firebaseSignInWithGoogle = async (): Promise<User> => {
  const services = initFirebase();
  if (!services) throw new Error('FIREBASE_NOT_CONFIGURED');
  
  try {
    // Check for any pending redirect operations first
    try {
      const redirectResult = await getRedirectResult(services.auth);
      if (redirectResult?.user) {
        return redirectResult.user;
      }
    } catch (redirectError: any) {
      console.error('Redirect result error:', redirectError);
      // Clear auth state if there's an issue with redirect
      await fbSignOut(services.auth);
    }

    // Try popup signin first
    try {
      const result = await signInWithPopup(services.auth, services.googleProvider);
      if (result?.user) {
        return result.user;
      }
      throw new Error('No user returned from popup sign in');
    } catch (popupError: any) {
      // If popup is blocked or fails, fall back to redirect
      if (
        popupError.code === 'auth/popup-blocked' ||
        popupError.code === 'auth/popup-closed-by-user' ||
        popupError.code === 'auth/browser-not-supported'
      ) {
        // Clear any existing auth state before redirect
        await fbSignOut(services.auth);
        
        // Attempt redirect sign-in
        await signInWithRedirect(services.auth, services.googleProvider);
        // This line won't be reached as redirect will reload the page
        throw new Error('REDIRECT_PENDING');
      }
      throw popupError;
    }
  } catch (error: any) {
    console.error('Firebase auth error:', error);
    throw new Error(error.message || 'Authentication failed');
  }
};

export const firebaseSignOut = async () => {
  const services = initFirebase();
  if (!services) return;
  await fbSignOut(services.auth);
};

export const firebaseHandleRedirectResult = async (): Promise<User | null> => {
  const svc = initFirebase();
  if (!svc) return null;
  const res = await getRedirectResult(svc.auth).catch(() => null);
  return res?.user || null;
};

export const getUserSnapshotDocRef = (uid: string) => {
  const svc = initFirebase();
  if (!svc) throw new Error('FIREBASE_NOT_CONFIGURED');
  return doc(svc.db, 'users', uid, 'sync', 'snapshot');
};

export const readUserSnapshot = async (uid: string): Promise<any | null> => {
  const ref = getUserSnapshotDocRef(uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

export const writeUserSnapshot = async (uid: string, data: any): Promise<void> => {
  const ref = getUserSnapshotDocRef(uid);
  await setDoc(ref, data, { merge: true });
};


