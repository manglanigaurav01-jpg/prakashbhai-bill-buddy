import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createEnhancedBackup, listAvailableBackups, restoreFromEnhancedBackup } from '@/lib/enhanced-backup';
import { useToast } from '@/components/ui/use-toast';
import { Download, Upload, Trash2, RefreshCw } from 'lucide-react';

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
}

export const BackupManager = () => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const { toast } = useToast();

  const loadBackups = async () => {
    const availableBackups = await listAvailableBackups();
    setBackups(availableBackups);
    if (availableBackups.length > 0) {
      setLastBackup(availableBackups[0].timestamp);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      const result = await createEnhancedBackup();
      if (result.success) {
        toast({
          title: "Backup Created",
          description: `Successfully created backup with ${result.metadata.counts.bills} bills and ${result.metadata.counts.payments} payments.`
        });
        await loadBackups();
      } else {
        throw new Error(result.message);
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

  const handleRestore = async (fileName: string) => {
    if (!confirm("Are you sure you want to restore this backup? This will replace all current data.")) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await restoreFromEnhancedBackup(fileName);
      if (result.success) {
        toast({
          title: "Backup Restored",
          description: `Successfully restored data with ${result.metadata.counts.bills} bills and ${result.metadata.counts.payments} payments.`
        });
        await loadBackups();
      } else {
        throw new Error(result.message);
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(backup.fileName)}
                        disabled={isLoading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
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
            </div>

            {backups.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No backups available. Create your first backup to protect your data.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          Backups include all your data: customers, bills, payments, items, and their complete history.
          Each backup maintains the relationships between all data for accurate restoration.
        </AlertDescription>
      </Alert>
    </div>
  );
};