import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Loader2Icon, CloudIcon, CloudOffIcon, RefreshCwIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSyncStore } from '@/lib/sync-store';
import { getCurrentUser, signInWithGoogle, signOut, syncUp, syncDown } from '@/lib/cloud';

export const AutoSync = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    if (user) {
      handleSync();
    }

    // Check network status
    const handleOnline = () => setSyncError(null);
    const handleOffline = () => setSyncError('No internet connection');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const handleSync = async () => {
    if (!user || isLoading) return;
    if (!navigator.onLine) {
      setSyncError('No internet connection');
      return;
    }

    setIsLoading(true);
    setSyncError(null);

    try {
      // First push local changes
      const pushResult = await syncUp();
      if (!pushResult.success) {
        throw new Error(pushResult.message);
      }

      // Then pull remote changes
      const pullResult = await syncDown();
      if (!pullResult.success) {
        throw new Error(pullResult.message);
      }

      setLastSync(new Date().toISOString());
      toast({
        title: 'Sync Complete',
        description: 'Your data is now up to date across all devices.',
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncError(error.message);
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: error.message || 'Please check your connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      const newUser = await signInWithGoogle();
      setUser(newUser);
      toast({
        title: 'Signed In',
        description: 'You can now sync your data across devices.',
      });
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      toast({
        title: 'Signed Out',
        description: 'Your data will no longer sync across devices.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign Out Failed',
        description: error.message || 'Please try again.',
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {navigator.onLine ? 
            <CloudIcon className="h-5 w-5" /> : 
            <CloudOffIcon className="h-5 w-5" />
          }
          Auto-Sync
        </CardTitle>
        <CardDescription>
          {user
            ? 'Your data automatically syncs across all your devices'
            : 'Sign in to enable automatic data sync'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {syncError && (
          <div className="mb-4">
            <Alert variant="destructive">
              <AlertTitle>Sync Failed</AlertTitle>
              <AlertDescription>{syncError}</AlertDescription>
            </Alert>
          </div>
        )}

        {user ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Signed in as</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleSignOut} 
                disabled={isLoading}
              >
                Sign Out
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Last synced</p>
                <p className="text-sm text-muted-foreground">
                  {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleSync}
                disabled={isLoading || !navigator.onLine}
              >
                {isLoading ? (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudIcon className="mr-2 h-4 w-4" />
                )}
                Sync Now
              </Button>
            </div>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={handleSignIn}
            disabled={isLoading || !navigator.onLine}
          >
            {isLoading ? (
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CloudIcon className="mr-2 h-4 w-4" />
            )}
            Sign in with Google
          </Button>
        )}
      </CardContent>
    </Card>
  );
                  }
                }}
              >
                Push to Cloud
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const auth = getAuth();
                  const user = auth.currentUser;
                  if (user) {
                    const result = await syncFromCloud(user.uid);
                    toast({
                      title: result.success ? 'Sync Complete' : 'Sync Failed',
                      description: result.success ? 'Data pulled from cloud successfully' : result.error,
                      variant: result.success ? 'default' : 'destructive'
                    });
                    if (result.success) {
                      window.location.reload(); // Refresh to show updated data
                    }
                  }
                }}
              >
                Pull from Cloud
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};