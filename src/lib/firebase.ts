import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut as fbSignOut, type Auth, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

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

  try {
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
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return null;
  }
};

export const firebaseSignInWithGoogle = async (): Promise<User> => {
  const services = initFirebase();
  if (!services) throw new Error('FIREBASE_NOT_CONFIGURED');

  try {
    // Clear any existing auth state to prevent session conflicts
    await fbSignOut(services.auth).catch(() => {}); // Ignore errors during signout

    // Clear any stored auth state
    localStorage.removeItem('auth_user');
    localStorage.removeItem('cloud_user_v1');

    // Configure provider for better compatibility
    services.googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Sign-in timeout. Please check your internet connection and try again.')), 45000); // 45 second timeout
    });

    // Check if we're on mobile platform
    const isMobile = Capacitor.isNativePlatform() || (typeof window !== 'undefined' && window.innerWidth < 768);
    
    // First, check if there's a redirect result (user returning from Google sign-in)
    try {
      const redirectResult = await getRedirectResult(services.auth);
      if (redirectResult?.user) {
        // User just completed redirect sign-in
        localStorage.setItem('auth_user', JSON.stringify({
          uid: redirectResult.user.uid,
          email: redirectResult.user.email,
          displayName: redirectResult.user.displayName,
          timestamp: Date.now()
        }));
        return redirectResult.user;
      }
    } catch (redirectCheckError) {
      // No redirect result, continue with normal sign-in flow
      console.log('No redirect result found, proceeding with sign-in');
    }

    // Perform sign-in based on platform
    let result: any;
    
    if (isMobile) {
      // Mobile: use redirect flow (more reliable on mobile)
      // Initiate redirect - page will reload after user signs in
      await signInWithRedirect(services.auth, services.googleProvider);
      // This will cause a page reload, so we won't reach here
      // The redirect result will be handled above on next page load
      throw new Error('Redirecting to Google sign-in...');
    } else {
      // Desktop: use popup
      const signInPromise = signInWithPopup(services.auth, services.googleProvider);
      result = await Promise.race([signInPromise, timeoutPromise]) as any;
    }

    if (!result?.user) {
      throw new Error('No user data received from Google');
    }

    // Store auth state in localStorage for persistence
    localStorage.setItem('auth_user', JSON.stringify({
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      timestamp: Date.now()
    }));

    return result.user;

  } catch (error: any) {
    console.error('Google sign-in error:', error);

    // Clear any problematic auth state
    localStorage.removeItem('auth_user');
    localStorage.removeItem('cloud_user_v1');
    await fbSignOut(services.auth).catch(() => {});

    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    }

    if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked. Please allow popups for this site and try again.');
    }

    if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection and try again.');
    }

    if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many sign-in attempts. Please wait a few minutes and try again.');
    }

    if (error.message?.includes('timeout')) {
      throw new Error('Sign-in timed out. Please check your internet connection and try again.');
    }

    throw new Error(error.message || 'Sign-in failed. Please try again.');
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


