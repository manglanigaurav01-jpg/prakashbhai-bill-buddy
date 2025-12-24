// Centralized Firebase config with env overrides so new OAuth credentials
// can be swapped without rebuilding code.
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyCD-kUBQCrz7kuNYHewynw1-8blwZsQb4w",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "prakashbhai-bill-buddy-85123.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "prakashbhai-bill-buddy-85123",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "prakashbhai-bill-buddy-85123.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "491579424292",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:491579424292:android:93a7e573e3498a6cdee2b1"
};