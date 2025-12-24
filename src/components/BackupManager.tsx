import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createSimpleBackup, createComprehensiveBackup, createFolderBasedBackup, restoreSimpleBackup } from '@/lib/simple-backup';
import { restoreFromEnhancedBackup } from '@/lib/enhanced-backup';
import { useToast } from '@/components/ui/use-toast';
import { Download, Upload, RefreshCw, FileText, Users, Receipt, CreditCard, Folder } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Badge } from '@/components/ui/badge';
import { DataImportValidator } from '@/components/DataImportValidator';

export const BackupManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [importData, setImportData] = useState<{ content: string; isValid: boolean } | null>(null);
  const { toast } = useToast();

  const loadBackups = async () => {
    // Simple backup system doesn't maintain a list of backups
    // Users create and download backups manually
    setLastBackup(null);
  };

  const handleUploadBackup = async () => {
    try {
      // Check if we're on mobile platform
      if (Capacitor.getPlatform() !== 'web') {
        // For mobile, use a file picker dialog (via hidden input)
        try {
          // Create a hidden input element that works better on mobile
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/json,.json,text/json';
          input.style.display = 'none';
          
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
              setIsLoading(false);
              return;
            }

            // Validate file type
            if (!file.name.toLowerCase().endsWith('.json') && !file.type.includes('json')) {
              toast({
                title: 'Invalid File Format',
                description: 'Please select a valid JSON backup file (.json)',
                variant: 'destructive'
              });
              setIsLoading(false);
              return;
            }

            setIsLoading(true);
            const reader = new FileReader();

            reader.onload = async (event) => {
              try {
                const content = event.target?.result as string;
                if (!content || content.trim().length === 0) {
                  throw new Error('File is empty or could not be read');
                }
                // Show validation dialog instead of directly importing
                setImportData({ content, isValid: false });
                setIsLoading(false);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to restore backup';
                toast({
                  title: 'File Read Failed',
                  description: errorMessage.includes('JSON') || errorMessage.includes('parse') 
                    ? 'Invalid backup file format. Please ensure the file is a valid JSON backup.'
                    : errorMessage,
                  variant: 'destructive'
                });
                setIsLoading(false);
              }
            };

            reader.onerror = () => {
              toast({
                title: 'File Read Error',
                description: 'Failed to read the backup file. Please try again.',
                variant: 'destructive'
              });
              setIsLoading(false);
            };

            reader.readAsText(file);
          };

          document.body.appendChild(input);
          input.click();
          // Clean up after a delay
          setTimeout(() => {
            document.body.removeChild(input);
          }, 1000);
        } catch (mobileError) {
          toast({
            title: 'File Selection Failed',
            description: 'Please ensure you have file access permissions enabled.',
            variant: 'destructive'
          });
          setIsLoading(false);
        }
      } else {
        // Web platform - use standard file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json,text/json';
        input.style.display = 'none';

        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            setIsLoading(false);
            return;
          }

          // Validate file type
          if (!file.name.toLowerCase().endsWith('.json') && !file.type.includes('json')) {
            toast({
              title: 'Invalid File Format',
              description: 'Please select a valid JSON backup file (.json)',
              variant: 'destructive'
            });
            setIsLoading(false);
            return;
          }

          setIsLoading(true);
          const reader = new FileReader();

          reader.onload = async (event) => {
            try {
              const content = event.target?.result as string;
              if (!content || content.trim().length === 0) {
                throw new Error('File is empty or could not be read');
              }
              // Show validation dialog instead of directly importing
              setImportData({ content, isValid: false });
              setIsLoading(false);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to restore backup';
              toast({
                title: 'File Read Failed',
                description: errorMessage.includes('JSON') || errorMessage.includes('parse')
                  ? 'Invalid backup file format. Please ensure the file is a valid JSON backup.'
                  : errorMessage,
                variant: 'destructive'
              });
              setIsLoading(false);
            }
          };

          reader.onerror = () => {
            toast({
              title: 'File Read Error',
              description: 'Failed to read the backup file. Please try again.',
              variant: 'destructive'
            });
            setIsLoading(false);
          };

          reader.readAsText(file);
        };

        document.body.appendChild(input);
        input.click();
        setTimeout(() => {
          document.body.removeChild(input);
        }, 1000);
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload backup file',
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

  const handleCreateComprehensiveBackup = async () => {
    setIsLoading(true);
    try {
      const result = await createComprehensiveBackup();
      if (result.success) {
        toast({
          title: "Comprehensive Backup Created",
          description: result.message || "Complete backup with all customer data, bills, payments, and balance PDFs has been created."
        });
        setLastBackup(new Date().toISOString());
      } else {
        throw new Error(result.message || 'Failed to create comprehensive backup');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Comprehensive Backup Failed",
        description: error instanceof Error ? error.message : "Failed to create comprehensive backup"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolderBasedBackup = async () => {
    setIsLoading(true);
    try {
      const result = await createFolderBasedBackup();
      if (result.success) {
        toast({
          title: "Folder-Based Backup Created",
          description: result.message || "Organized backup with customer folders and bill PDFs has been created."
        });
        setLastBackup(new Date().toISOString());
      } else {
        throw new Error(result.message || 'Failed to create folder-based backup');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Folder-Based Backup Failed",
        description: error instanceof Error ? error.message : "Failed to create folder-based backup"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidatedImport = async (data: any) => {
    try {
      // Try enhanced backup restore first, fallback to simple backup
      let result;
      try {
        result = await restoreFromEnhancedBackup(JSON.stringify(data));
      } catch (e) {
        // If enhanced backup fails, try simple backup restore
        result = await restoreSimpleBackup(JSON.stringify(data));
      }
      
      if (result && result.success) {
        toast({
          title: 'Backup Restored',
          description: 'Your backup has been successfully restored.',
        });
        loadBackups();
        setImportData(null);
      } else {
        throw new Error(result?.error || result?.message || 'Failed to restore backup');
      }
    } catch (error) {
      toast({
        title: 'Restore Failed',
        description: error instanceof Error ? error.message : 'Failed to restore backup',
        variant: 'destructive'
      });
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
          <div className="space-y-6">
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
            </div>

            {/* Backup Options */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Choose Backup Type</h4>

              {/* Simple Backup */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <h5 className="font-medium">Simple Backup</h5>
                      <p className="text-sm text-muted-foreground">Basic data backup (customers, bills, payments, items)</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Fast</Badge>
                </div>
                <Button
                  onClick={handleCreateBackup}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Create Simple Backup
                </Button>
              </div>

              {/* Comprehensive Backup */}
              <div className="border rounded-lg p-4 space-y-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <Users className="h-4 w-4 text-green-600" />
                      <Receipt className="h-4 w-4 text-blue-600" />
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      <FileText className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <h5 className="font-medium">Comprehensive Backup</h5>
                      <p className="text-sm text-muted-foreground">Complete backup with customer details, bills, payments, and balance PDFs</p>
                    </div>
                  </div>
                  <Badge variant="default">Complete</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span>All customer names and details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-3 w-3" />
                    <span>Bills with item names, dates, totals, and quantities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3 w-3" />
                    <span>Payment amounts and dates for all customers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span>Last balance PDFs for all customers</span>
                  </div>
                </div>
                <Button
                  onClick={handleCreateComprehensiveBackup}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Create Comprehensive Backup
                </Button>
              </div>

              {/* Folder-Based Backup */}
              <div className="border rounded-lg p-4 space-y-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-purple-600" />
                    <div>
                      <h5 className="font-medium">Folder-Based Backup</h5>
                      <p className="text-sm text-muted-foreground">Organized backup with customer folders containing individual bill PDFs</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-purple-300 text-purple-700">Organized</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Folder className="h-3 w-3" />
                    <span>Main backup folder in "My Files"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span>Customer-named subfolders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span>Individual bill PDFs inside each customer folder</span>
                  </div>
                </div>
                <Button
                  onClick={handleCreateFolderBasedBackup}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Folder className="h-4 w-4 mr-2" />
                  )}
                  Create Folder-Based Backup
                </Button>
              </div>
            </div>

            {/* Restore Section */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Restore Data</h4>
              <Button variant="outline" onClick={handleUploadBackup} disabled={isLoading}>
                <Upload className="h-4 w-4 mr-2" />
                {isLoading ? 'Uploading...' : 'Upload & Restore Backup'}
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

      {importData && (
        <DataImportValidator
          fileContent={importData.content}
          onValidate={(isValid) => setImportData({ ...importData, isValid })}
          onImport={handleValidatedImport}
          onCancel={() => setImportData(null)}
        />
      )}
    </div>
  );
};