import { useEffect, useRef, useCallback } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Define view types
type View =
  | 'dashboard'
  | 'createBill'
  | 'customers'
  | 'balance'
  | 'amountTracker'
  | 'lastBalance'
  | 'totalBusiness'
  | 'itemMaster'
  | 'editBills'
  | 'editPayments'
  | 'settings'
  | 'analytics'
  | 'balanceHistory'
  | 'recycleBin'
  | 'statistics';

export function useMobileNavigation(setCurrentView: (view: View) => void) {
  const navigationStack = useRef<View[]>(['dashboard']);
  const listenerHandleRef = useRef<any>(null);

  const handleBackButton = useCallback(() => {
    // If we have more than one view in the stack, go back
    if (navigationStack.current.length > 1) {
      navigationStack.current.pop(); // Remove current view
      const previousView = navigationStack.current[navigationStack.current.length - 1];
      setCurrentView(previousView);
    } else {
      // Always navigate to dashboard instead of closing app
      navigationStack.current = ['dashboard'];
      setCurrentView('dashboard');
    }
  }, [setCurrentView]);

  useEffect(() => {
    // Only set up listener for native platforms
    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', handleBackButton).then((handle: any) => {
        listenerHandleRef.current = handle;
      });

      return () => {
        if (listenerHandleRef.current) {
          listenerHandleRef.current.remove();
        }
      };
    }

    // For web, handle browser back button
    if (!Capacitor.isNativePlatform()) {
      const handlePopState = () => {
        handleBackButton();
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [handleBackButton]);

  const navigateTo = useCallback((view: View) => {
    const currentView = navigationStack.current[navigationStack.current.length - 1];
    if (currentView !== view) {
      navigationStack.current.push(view);
      // Push state for web browser history
      if (!Capacitor.isNativePlatform() && window.history) {
        window.history.pushState({ view }, '', `#${view}`);
      }
    }
    setCurrentView(view);
  }, [setCurrentView]);

  return { navigateTo };
}
