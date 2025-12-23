import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';

export function useMobileNavigation(setCurrentView: (view: string) => void) {
  const navigationStack = useRef<string[]>(['dashboard']);

  useEffect(() => {
    // Listen for back button events
    const backButtonListener = App.addListener('backButton', () => {
      // If we have more than one view in the stack, go back
      if (navigationStack.current.length > 1) {
        navigationStack.current.pop(); // Remove current view
        const previousView = navigationStack.current[navigationStack.current.length - 1];
        setCurrentView(previousView);
      } else {
        // If we're at the root (dashboard), let the app close naturally
        // This prevents the app from closing unexpectedly
        App.exitApp();
      }
    });

    return () => {
      backButtonListener.remove();
    };
  }, [setCurrentView]);

  const navigateTo = (view: string) => {
    // Add current view to stack before navigating
    const currentView = navigationStack.current[navigationStack.current.length - 1];
    if (currentView !== view) {
      navigationStack.current.push(view);
    }
    setCurrentView(view);
  };

  return { navigateTo };
}
