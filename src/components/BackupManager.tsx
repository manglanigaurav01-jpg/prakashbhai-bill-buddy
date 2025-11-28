import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createEnhancedBackup, listAvailableBackups, restoreFromEnhancedBackup } from '@/lib/enhanced-backup';
import { useToast } from '@/components/ui/use-toast';
import { Download, Upload, Trash2, RefreshCw } from 'lucide-react';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
// Use web APIs for clipboard/open to avoid requiring extra Capacitor plugins

// Filesystem directory constants
const DATA_DIR = 'DATA';

interface BackupInfo {
  fileName: string;
  timestamp: string;
  metadata: {
    counts: {
      customers: number;
      bills: number;
      payments: number;
      items: number;
    };
    totalAmount: {
      billed: number;
      paid: number;
      outstanding: number;
    };
    dateRange: {
      firstBill: string;
      lastBill: string;
      firstPayment: string;
      lastPayment: string;
    };
  };
  uri?: string | undefined;
  storageKey?: string; // For web platform localStorage key
}

export const BackupManager = () => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<BackupInfo | null>(null);
  const [snapshotBeforeRestore, setSnapshotBeforeRestore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupLocation, setBackupLocation] = useState<string | null>(null);
  const { toast } = useToast();

  const loadBackups = async () => {
    const availableBackups = await listAvailableBackups();
    setBackups(availableBackups);
    if (availableBackups.length > 0) {
      setLastBackup(availableBackups[0].timestamp);
      // Get the backup location - handle web vs mobile differently
      const isWeb = Capacitor.getPlatform() === 'web';
      if (isWeb) {
        // For web, use the URI from the backup info
        setBackupLocation(availableBackups[0].uri || null);
      } else {
        // For mobile, get URI from Filesystem
        try {
          const { uri } = await Filesystem.getUri({
            path: availableBackups[0].fileName,
            directory: "DATA"
          });
          setBackupLocation(uri);
        } catch (error) {
          console.error('Error getting backup location:', error);
          setBackupLocation(availableBackups[0].uri || null);
        }
      }
    }
  };

  const handleUploadBackup = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        setIsLoading(true);
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          try {
            const content = event.target?.result as string;
            const isWeb = Capacitor.getPlatform() === 'web';
            
            if (isWeb) {
              // For web, directly restore from the file content
              const result = await restoreFromEnhancedBackup(content);
              if (result.success) {
                toast({
                  title: 'Backup Restored',
                  description: 'Your backup has been successfully restored.',
                });
                loadBackups();
              } else {
                throw new Error(result.error);
              }
            } else {
              // For mobile, save the uploaded file to app storage first
              const fileName = `restored_backup_${new Date().getTime()}.json`;
              await Filesystem.writeFile({
                path: fileName,
                data: content,
                directory: "DATA"
              });
              const result = await restoreFromEnhancedBackup(fileName);
              if (result.success) {
                toast({
                  title: 'Backup Restored',
                  description: 'Your backup has been successfully restored.',
                });
                loadBackups();
              } else {
                throw new Error(result.error);
              }
            }
          } catch (error) {
            toast({
              title: 'Restore Failed',
              description: error instanceof Error ? error.message : 'Failed to restore backup',
              variant: 'destructive'
            });
          } finally {
            setIsLoading(false);
          }
        };
        
        reader.readAsText(file);
      };
      
      input.click();
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload backup file',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      const result = await createEnhancedBackup();
      if (result.success && result.metadata) {
        const isWeb = Capacitor.getPlatform() === 'web';
        if (isWeb) {
          toast({
            title: "Backup Created",
            description: `Successfully created backup with ${result.metadata.counts.bills} bills and ${result.metadata.counts.payments} payments. File downloaded.`
          });
        } else {
          toast({
            title: "Backup Created",
            description: `Backup created successfully! Please save it to your preferred location (Downloads, Drive, etc.) using the share dialog.`
          });
        }
        await loadBackups();
      } else {
        throw new Error(result.message || 'Failed to create backup');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: error instanceof Error ? error.message : "Failed to create backup"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBackupLocation = async () => {
    if (!backupLocation) return;
    try {
      // Prefer window.open in web builds. On native, Filesystem URIs may be handled by the OS.
      window.open(backupLocation, '_blank');
    } catch (e) {
      console.error('Failed to open backup location:', e);
      toast({ variant: 'destructive', title: 'Open Failed', description: 'Unable to open backup location' });
    }
  };

  const handleCopyBackupLocation = async () => {
    if (!backupLocation) return;
    try {
      if (navigator && (navigator as any).clipboard && (navigator as any).clipboard.writeText) {
        await (navigator as any).clipboard.writeText(backupLocation);
        toast({ title: 'Copied', description: 'Backup location copied to clipboard.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Copy Failed', description: 'Unable to copy to clipboard' });
    }
  };

  const handleRestore = async (backup: BackupInfo) => {
    if (!confirm("Are you sure you want to restore this backup? This will replace all current data.")) {
      return;
    }

    setIsLoading(true);
    try {
      // Use storageKey for web, fileName for mobile
      const isWeb = Capacitor.getPlatform() === 'web';
      const restorePath = isWeb && backup.storageKey ? backup.storageKey : backup.fileName;
      
      const result = await restoreFromEnhancedBackup(restorePath);
      if (result.success && result.metadata) {
        toast({
          title: "Backup Restored",
          description: `Successfully restored data with ${result.metadata.counts.bills} bills and ${result.metadata.counts.payments} payments.`
        });
        await loadBackups();
      } else {
        throw new Error(result.message || 'Failed to restore backup');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description: error instanceof Error ? error.message : "Failed to restore backup"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Backup & Restore</CardTitle>
          <CardDescription>Manage your data backups and restore points</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium">Last Backup</h3>
                <p className="text-sm text-muted-foreground">
                  {lastBackup 
                    ? new Date(lastBackup).toLocaleString()
                    : "No backups available"}
                </p>
                {Capacitor.getPlatform() !== 'web' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Backups are shared automatically. Save them to Downloads, Drive, or any accessible location.
                  </p>
                )}
              </div>
              <Button 
                onClick={handleCreateBackup} 
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Create Backup
              </Button>
            </div>

            <div className="border rounded-lg">
              <div className="divide-y">
                {backups.map((backup) => (
                  <div key={backup.fileName} className="p-4 hover:bg-muted">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">
                          {new Date(backup.timestamp).toLocaleString()}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {backup.metadata.dateRange.firstBill} to {backup.metadata.dateRange.lastBill}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {backup.uri && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => { if (backup.uri) window.open(backup.uri, '_blank'); }}>
                              Open
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { if (backup.uri) navigator.clipboard?.writeText(backup.uri); toast({ title: 'Copied', description: 'Backup URI copied to clipboard.' }); }}>
                              Copy
                            </Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                              try {
                                let content: string | undefined;
                                const isWeb = Capacitor.getPlatform() === 'web';
                                
                                if (isWeb && backup.storageKey) {
                                  // For web, read from localStorage
                                  content = localStorage.getItem(backup.storageKey) || undefined;
                                } else if (backup.uri && backup.uri.startsWith('blob:')) {
                                  // fetch blob
                                  const resp = await fetch(backup.uri);
                                  content = await resp.text();
                                } else {
                                  // read from filesystem by filename
                                  try {
                                    const { data } = await Filesystem.readFile({ path: backup.fileName, directory: DATA_DIR });
                                    content = data.toString();
                                  } catch (e) {
                                    console.error('Failed to read file for download:', e);
                                  }
                                }
                                if (content) {
                                  const blob = new Blob([content], { type: 'application/json' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = backup.fileName;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(url);
                                }
                              } catch (e) {
                                toast({ variant: 'destructive', title: 'Download Failed', description: 'Unable to download backup' });
                              }
                            }}>
                              Download
                            </Button>
                            {/* show download link for web blob URIs */}
                            
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={async () => {
                          // View raw JSON modal
                          try {
                            let content: string | undefined;
                            const isWeb = Capacitor.getPlatform() === 'web';
                            
                            if (isWeb && backup.storageKey) {
                              // For web, read from localStorage
                              content = localStorage.getItem(backup.storageKey) || undefined;
                            } else if (backup.uri && backup.uri.startsWith('blob:')) {
                              const resp = await fetch(backup.uri);
                              content = await resp.text();
                            } else {
                              const { data } = await Filesystem.readFile({ path: backup.fileName, directory: DATA_DIR });
                              content = data.toString();
                            }
                            setPreviewItem({ ...backup, metadata: backup.metadata, uri: backup.uri });
                            // attach raw JSON to previewItem via (as any) for modal display
                            (setPreviewItem as any)((prev: any) => ({ ...prev, rawJson: content }));
                            setPreviewOpen(true);
                          } catch (e) {
                            toast({ variant: 'destructive', title: 'View Failed', description: 'Unable to read backup content' });
                          }
                        }}>
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setPreviewItem(backup); setPreviewOpen(true); }}
                          disabled={isLoading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Restore
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                      <div>
                        <p className="text-sm font-medium">Bills</p>
                        <p className="text-sm">{backup.metadata.counts.bills}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Payments</p>
                        <p className="text-sm">{backup.metadata.counts.payments}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Billed</p>
                        <p className="text-sm">₹{backup.metadata.totalAmount.billed.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Paid</p>
                        <p className="text-sm">₹{backup.metadata.totalAmount.paid.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4">
                <Button variant="outline" onClick={handleUploadBackup} disabled={isLoading}>
                  <Upload className="h-4 w-4 mr-2" /> Upload Backup
                </Button>
              </div>
            </div>

            {backups.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No backups available. Create your first backup to protect your data.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

        {/* Preview / Confirm Restore Dialog */}
        {previewOpen && previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white rounded shadow-lg max-w-2xl w-full p-6">
              <h3 className="text-lg font-semibold mb-2">Preview Backup</h3>
              <p className="text-sm text-muted-foreground mb-4">
                File: <span className="font-mono">{previewItem.fileName}</span>
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium">Bills</p>
                  <p className="text-sm">{previewItem.metadata.counts.bills}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Payments</p>
                  <p className="text-sm">{previewItem.metadata.counts.payments}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Date Range</p>
                  <p className="text-sm">{previewItem.metadata.dateRange.firstBill} to {previewItem.metadata.dateRange.lastBill}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Outstanding</p>
                  <p className="text-sm">₹{previewItem.metadata.totalAmount.outstanding.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <input id="snapshotBefore" type="checkbox" checked={snapshotBeforeRestore} onChange={(e) => setSnapshotBeforeRestore(e.target.checked)} />
                <label htmlFor="snapshotBefore" className="text-sm">Create snapshot before restore</label>
              </div>
              {(previewItem as any)?.rawJson && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Raw JSON</h4>
                  <pre className="max-h-64 overflow-auto p-2 bg-gray-100 rounded text-xs">{JSON.stringify(JSON.parse((previewItem as any).rawJson), null, 2)}</pre>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setPreviewOpen(false); setPreviewItem(null); }}>Cancel</Button>
                <Button onClick={async () => {
                  setPreviewOpen(false);
                  setIsLoading(true);
                  try {
                    if (snapshotBeforeRestore) {
                      // create quick snapshot
                      await createEnhancedBackup();
                    }
                    // Use storageKey for web, fileName for mobile
                    const isWeb = Capacitor.getPlatform() === 'web';
                    const restorePath = isWeb && previewItem.storageKey ? previewItem.storageKey : previewItem.fileName;
                    const result = await restoreFromEnhancedBackup(restorePath);
                    if (result.success && result.metadata) {
                      toast({ title: 'Restored', description: `Restored ${result.metadata.counts.bills} bills` });
                      await loadBackups();
                    } else {
                      throw new Error(result.message || 'Failed to restore backup');
                    }
                  } catch (err) {
                    toast({ variant: 'destructive', title: 'Restore Failed', description: err instanceof Error ? err.message : String(err) });
                  } finally {
                    setIsLoading(false);
                    setPreviewItem(null);
                  }
                }}>Confirm Restore</Button>
              </div>
            </div>
          </div>
        )}

      <Alert>
        <AlertDescription>
          Backups include all your data: customers, bills, payments, items, and their complete history.
          Each backup maintains the relationships between all data for accurate restoration.
        </AlertDescription>
      </Alert>
    </div>
  );
};