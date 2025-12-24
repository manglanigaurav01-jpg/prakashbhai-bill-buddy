import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';

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

  useEffect(() => {
    // Listen for back button events
    let listenerHandle: any = null;

    App.addListener('backButton', () => {
      // If we have more than one view in the stack, go back
      if (navigationStack.current.length > 1) {
        navigationStack.current.pop(); // Remove current view
        const previousView = navigationStack.current[navigationStack.current.length - 1];
        setCurrentView(previousView);
      } else {
        // Always navigate to dashboard instead of closing app
        // Reset stack to only contain dashboard
        navigationStack.current = ['dashboard'];
        setCurrentView('dashboard');
      }
    }).then((handle: any) => {
      listenerHandle = handle;
    });

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [setCurrentView]);

  const navigateTo = (view: View) => {
    // Add current view to stack before navigating
    const currentView = navigationStack.current[navigationStack.current.length - 1];
    if (currentView !== view) {
      navigationStack.current.push(view);
    }
    setCurrentView(view);
  };

  return { navigateTo };
}
