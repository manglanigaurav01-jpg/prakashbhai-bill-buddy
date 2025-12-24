import { Capacitor } from '@capacitor/core';
import { firebaseSignInWithGoogle, firebaseSignOut, initFirebase } from './firebase';

export const signInWithGoogle = async () => {
  try {
    const user = await firebaseSignInWithGoogle();
    return { success: true, user };
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
    await firebaseSignOut();
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
  const svc = initFirebase();
  return svc?.auth.currentUser ?? null;
};

export const onAuthStateChanged = (callback: (user: any) => void) => {
  const svc = initFirebase();
  if (!svc) return () => {};
  return svc.auth.onAuthStateChanged(callback);
};

export const clearAuthSessionState = async () => {
  try {
    // Clear any existing auth state to prevent session conflicts
    await firebaseSignOut();

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
