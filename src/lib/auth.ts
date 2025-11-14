import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { FIREBASE_CONFIG } from './firebase.config';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);

// Initialize Google Auth for mobile
if (Capacitor.isNativePlatform()) {
  GoogleAuth.initialize();
}

export const signInWithGoogle = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Use native Google Sign-In for mobile
      const googleUser = await GoogleAuth.signIn();
      
      // Create credential for Firebase
      const credential = GoogleAuthProvider.credential(
        googleUser.authentication.idToken,
        googleUser.authentication.accessToken
      );

      // Sign in to Firebase with credential
      const result = await signInWithCredential(auth, credential);
      return { success: true, user: result.user };
    } else {
      // Use Firebase popup for web
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return { success: true, user: result.user };
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Sign in failed' };
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    if (Capacitor.isNativePlatform()) {
      await GoogleAuth.signOut();
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