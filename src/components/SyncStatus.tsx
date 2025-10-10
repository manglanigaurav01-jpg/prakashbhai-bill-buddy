import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

const STORAGE_KEYS = {
  SYNC_STATUS: 'prakash_sync_status',
  LAST_SYNC: 'prakash_last_sync',
};

interface SyncStatus {
  lastSync: string;
  isOnline: boolean;
  pendingChanges: number;
  syncErrors: any[];
}

export const SyncStatus: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>({
    lastSync: localStorage.getItem('prakash_last_sync') || 'Never',
    isOnline: navigator.onLine,
    pendingChanges: 0,
    syncErrors: []
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check sync status periodically
    const interval = setInterval(() => {
      const syncStatus = localStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      if (syncStatus) {
        const parsed = JSON.parse(syncStatus);
        setStatus(prev => ({
          ...prev,
          pendingChanges: parsed.pendingChanges || 0,
          syncErrors: parsed.errors || []
        }));
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {status.isOnline ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
          Sync Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Connection:</span>
            <Badge variant={status.isOnline ? "success" : "destructive"}>
              {status.isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Last Sync:</span>
            <span className="text-sm text-muted-foreground">
              {status.lastSync === 'Never' 
                ? 'Never' 
                : new Date(status.lastSync).toLocaleString()}
            </span>
          </div>
          {status.pendingChanges > 0 && (
            <div className="flex items-center justify-between">
              <span>Pending Changes:</span>
              <Badge variant="secondary">{status.pendingChanges}</Badge>
            </div>
          )}
          {status.syncErrors.length > 0 && (
            <div className="mt-2 text-sm text-destructive">
              {status.syncErrors.length} sync error(s)
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};