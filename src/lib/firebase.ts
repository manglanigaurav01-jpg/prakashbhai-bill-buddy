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
  const svc = initFirebase();
  if (!svc) throw new Error('FIREBASE_NOT_CONFIGURED');
  
  try {
    // Try popup first (works better on desktop)
    const res = await signInWithPopup(svc.auth, svc.googleProvider);
    return res.user;
  } catch (err: any) {
    console.error('Google sign-in error:', err);
    
    // Handle specific error cases
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled by user');
    } else if (err.code === 'auth/popup-blocked') {
      // Fallback to redirect for environments that block popups
      try {
        await signInWithRedirect(svc.auth, svc.googleProvider);
        throw new Error('REDIRECTING_FOR_GOOGLE_SIGNIN');
      } catch (redirectErr: any) {
        throw new Error(`Sign-in failed: ${redirectErr.message || 'Unknown error'}`);
      }
    } else if (err.code === 'auth/unauthorized-domain') {
      throw new Error('Domain not authorized. Please check Firebase console settings.');
    } else if (err.code === 'auth/operation-not-allowed') {
      throw new Error('Google sign-in not enabled. Please enable it in Firebase console.');
    } else {
      throw new Error(`Sign-in failed: ${err.message || 'Unknown error'}`);
    }
  }
};

export const firebaseSignOut = async () => {
  const svc = initFirebase();
  if (!svc) return;
  await fbSignOut(svc.auth);
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


