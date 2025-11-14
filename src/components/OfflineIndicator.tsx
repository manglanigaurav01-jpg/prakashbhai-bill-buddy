import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      setShowOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-hide offline indicator after 5 seconds if it was just shown
  useEffect(() => {
    if (showOffline && !isOnline) {
      const timer = setTimeout(() => {
        setShowOffline(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showOffline, isOnline]);

  if (!showOffline && isOnline) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5">
      <Alert
        className={cn(
          "shadow-lg border-2 min-w-[280px]",
          isOnline 
            ? "bg-green-50 dark:bg-green-950 border-green-500" 
            : "bg-orange-50 dark:bg-orange-950 border-orange-500"
        )}
      >
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <WifiOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          )}
          <AlertDescription className={cn(
            "font-medium",
            isOnline 
              ? "text-green-800 dark:text-green-200" 
              : "text-orange-800 dark:text-orange-200"
          )}>
            {isOnline 
              ? "Connection restored" 
              : "You're offline. Some features may be limited."}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
};

