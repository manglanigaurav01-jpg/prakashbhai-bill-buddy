import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { FIREBASE_CONFIG } from './firebase.config';
import { Capacitor } from '@capacitor/core';

// Initialize Firebase - ensure only one instance
const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);

// Clear any existing auth state on initialization to prevent session conflicts
if (typeof window !== 'undefined') {
  // Clear Firebase auth persistence issues
  auth.signOut().catch(() => {});
}

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
    
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sign-in timeout. Please try again.')), 60000); // 60 second timeout
    });
    
    const signInPromise = signInWithPopup(auth, provider);
    
    // Race between sign-in and timeout
    const result = await Promise.race([signInPromise, timeoutPromise]) as any;
    
    if (result?.user) {
      return { success: true, user: result.user };
    } else {
      throw new Error('No user data received from sign-in');
    }
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    
    // Handle specific error cases
    if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup')) {
      return { success: false, error: 'Sign-in cancelled. Please try again.' };
    }
    
    if (error.code === 'auth/popup-blocked') {
      return { success: false, error: 'Popup was blocked. Please allow popups and try again.' };
    }
    
    if (error.message?.includes('timeout')) {
      return { success: false, error: 'Sign-in timed out. Please try again.' };
    }
    
    return { 
      success: false, 
      error: error.message || error.code || 'Sign in failed. Please try again.' 
    };
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

export const onAuthStateChanged = (callback: (user: any) => void) => {
  return auth.onAuthStateChanged(callback);
};

export const clearAuthSessionState = async () => {
  try {
    // Clear any existing auth state to prevent session conflicts
    await signOut(auth);

    // Clear any stored auth state
    localStorage.removeItem('auth_user');
    localStorage.removeItem('cloud_user_v1');

    // Clear any Firebase session storage issues
    if (typeof window !== 'undefined') {
      // Clear Firebase auth persistence issues
      sessionStorage.clear();
    }

    console.log('Auth session state cleared successfully');
  } catch (error) {
    console.error('Error clearing auth session state:', error);
  }
};
