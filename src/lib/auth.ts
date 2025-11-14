import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { FIREBASE_CONFIG } from './firebase.config';
import { Capacitor } from '@capacitor/core';

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);

// Initialize Google Auth for mobile (attempt dynamic import at runtime)
const tryInitNativeGoogleAuth = async () => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    // dynamic import prevents build-time dependency and avoids install-time ERESOLVE
    // if the package isn't present. If present, initialize it for native usage.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = await import('@codetrix-studio/capacitor-google-auth');
    if (mod && typeof mod.GoogleAuth?.initialize === 'function') {
      mod.GoogleAuth.initialize();
      return true;
    }
  } catch (err) {
    // If the dynamic import fails (package not installed), we silently skip
    // native GoogleAuth and fall back to web-based popup flows.
    console.warn('Native GoogleAuth not available:', err);
  }
  return false;
};

export const signInWithGoogle = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Try native plugin first (if installed); otherwise fall back to web popup
      try {
        const mod = await import('@codetrix-studio/capacitor-google-auth');
        if (mod && mod.GoogleAuth && typeof mod.GoogleAuth.signIn === 'function') {
          const googleUser = await mod.GoogleAuth.signIn();
          const credential = GoogleAuthProvider.credential(
            googleUser.authentication.idToken,
            googleUser.authentication.accessToken
          );
          const result = await signInWithCredential(auth, credential);
          return { success: true, user: result.user };
        }
      } catch (err) {
        console.warn('Native GoogleAuth not available, falling back to web popup:', err);
      }
      // If native path wasn't available, continue to web popup below
    }

    // Use Firebase popup for web (or fallback for native when plugin unavailable)
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Sign in failed' };
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    if (Capacitor.isNativePlatform()) {
      try {
        const mod = await import('@codetrix-studio/capacitor-google-auth');
        if (mod && mod.GoogleAuth && typeof mod.GoogleAuth.signOut === 'function') {
          await mod.GoogleAuth.signOut();
        }
      } catch (err) {
        // ignore if plugin not installed
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Sign out failed' };
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const onAuthStateChanged = (callback) => {
  return auth.onAuthStateChanged(callback);
};