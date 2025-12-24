import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Download, Upload, Database, FileText, Calendar, Users, Receipt, CreditCard, TrendingUp, CheckCircle, Share } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createComprehensiveBackup, restoreComprehensiveBackup, parseBackupFile, getBackupStatistics } from "@/lib/comprehensive-backup";

export const BackupManager = () => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const [selectedBackupContent, setSelectedBackupContent] = useState<string | null>(null);
  const [backupStats, setBackupStats] = useState<any>(null);
  const { toast } = useToast();

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const result = await createComprehensiveBackup();

      if (result.success) {
        toast({
          title: "Backup Created Successfully",
          description: result.message,
        });
      } else {
        toast({
          title: "Backup Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Backup creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const backupData = parseBackupFile(content);

      if (!backupData) {
        toast({
          title: "Invalid File",
          description: "The selected file is not a valid backup file.",
          variant: "destructive",
        });
        return;
      }

      const stats = getBackupStatistics(backupData);
      setSelectedBackupContent(content);
      setBackupStats(stats);
      setShowRestoreDialog(true);
    } catch (error) {
      console.error('File parsing error:', error);
      toast({
        title: "Error",
        description: "Failed to read the backup file.",
        variant: "destructive",
      });
    }

    // Reset file input
    event.target.value = '';
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackupContent) return;

    setIsRestoringBackup(true);
    try {
      const result = await restoreComprehensiveBackup(selectedBackupContent);

      if (result.success) {
        toast({
          title: "Backup Restored Successfully",
          description: result.message,
        });
        setShowRestoreDialog(false);
        setSelectedBackupContent(null);
        setBackupStats(null);

        // Refresh the page to update all components with restored data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast({
          title: "Restore Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: "Error",
        description: "Failed to restore backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRestoringBackup(false);
    }
  };

  return (
    <>
      <Card className="shadow-xl border-2 hover:shadow-2xl transition-all duration-300 bg-card/80 backdrop-blur-sm border-blue-500/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Comprehensive Backup</CardTitle>
              <CardDescription>Complete backup of all business data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
            <div className="flex items-start gap-3 mb-3">
              <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">What gets backed up:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Customer names and details</li>
                  <li>• All bills (latest edited versions only)</li>
                  <li>• All payments (latest edited versions only)</li>
                  <li>• Item master data and rates</li>
                  <li>• Last balance of all customers</li>
                  <li>• Complete business data summary</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              {isCreatingBackup ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>

            <Button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              variant="outline"
              className="w-full border-green-500/50 text-green-600 hover:bg-green-50"
            >
              {isCreatingBackup ? (
                <>
                  <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mr-2" />
                  Sharing Backup...
                </>
              ) : (
                <>
                  <Share className="w-4 h-4 mr-2" />
                  Share Backup
                </>
              )}
            </Button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="backup-file-input"
              />
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <label htmlFor="backup-file-input" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Restore Backup
                </label>
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Automatic deduplication of edited records</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Cross-platform compatibility (Web & Mobile)</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-orange-500/20 text-orange-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl">Confirm Backup Restoration</DialogTitle>
            </div>
            <DialogDescription className="text-sm">
              This will replace all current data with the backup data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {backupStats && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Backup Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{backupStats.createdAt}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Version</p>
                    <p className="font-medium">{backupStats.version}</p>
                  </div>
                </div>
              </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-medium text-blue-500">Customers</span>
                    </div>
                    <p className="text-lg font-bold">{backupStats.customers}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Receipt className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium text-green-500">Bills</span>
                    </div>
                    <p className="text-lg font-bold">{backupStats.bills}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-medium text-purple-500">Payments</span>
                    </div>
                    <p className="text-lg font-bold">{backupStats.payments}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-medium text-indigo-500">Items</span>
                    </div>
                    <p className="text-lg font-bold">{backupStats.totalItems || 0}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-medium text-orange-500">Revenue</span>
                    </div>
                    <p className="text-lg font-bold">₹{backupStats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> This will permanently replace all current data. Make sure you have a backup of your current data if needed.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRestoreDialog(false);
                setBackupStats(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestoreBackup}
              disabled={isRestoringBackup}
              variant="destructive"
              className="flex-1"
            >
              {isRestoringBackup ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Restoring...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Restore Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
