import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createSimpleBackup, restoreSimpleBackup } from '@/lib/simple-backup';
import { useToast } from '@/components/ui/use-toast';
import { Download, Upload, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export const BackupManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const { toast } = useToast();

  const loadBackups = async () => {
    // Simple backup system doesn't maintain a list of backups
    // Users create and download backups manually
    setLastBackup(null);
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
            const result = await restoreSimpleBackup(content);
            if (result.success) {
              toast({
                title: 'Backup Restored',
                description: 'Your backup has been successfully restored.',
              });
              loadBackups();
            } else {
              throw new Error(result.error);
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
      const result = await createSimpleBackup();
      if (result.success) {
        toast({
          title: "Backup Created",
          description: "Backup file has been downloaded to your device. Save it in a safe location."
        });
        setLastBackup(new Date().toISOString());
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



  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Backup & Restore</CardTitle>
          <CardDescription>Create backups and restore your data from JSON files</CardDescription>
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

            <div className="flex gap-4">
              <Button variant="outline" onClick={handleUploadBackup} disabled={isLoading}>
                <Upload className="h-4 w-4 mr-2" />
                {isLoading ? 'Uploading...' : 'Upload Backup'}
              </Button>
            </div>
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