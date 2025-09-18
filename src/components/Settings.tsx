import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeft, Moon, Sun, Trash2, Cloud, CalendarClock, LogIn, LogOut } from "lucide-react";
import { getCurrentUser, signInWithGoogle, signInWithMicrosoft, signOut, syncDown, syncUp, initCloudSync } from '@/lib/cloud';
import { useToast } from "@/hooks/use-toast";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { getBackupConfig, saveBackupConfig, runBackupNow, initAutoBackup, restoreBackupFromBlob } from '@/lib/backup';

interface SettingsProps {
  onNavigate: (view: string) => void;
}

export const Settings = ({ onNavigate }: SettingsProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { toast } = useToast();
  const [backupMode, setBackupMode] = useState<'automatic' | 'manual'>('automatic');
  const [backupFrequency, setBackupFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [lastBackupAt, setLastBackupAt] = useState<string | undefined>(undefined);
  const [cloudUser, setCloudUser] = useState<ReturnType<typeof getCurrentUser>>(null);

  // Check for existing dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);

    // Load backup configuration
    const cfg = getBackupConfig();
    setBackupMode(cfg.mode);
    setBackupFrequency(cfg.frequency);
    setLastBackupAt(cfg.lastRunAt);
    initAutoBackup();
    setCloudUser(getCurrentUser());
    initCloudSync();
  }, []);

  const toggleDarkMode = (enabled: boolean) => {
    setIsDarkMode(enabled);
    localStorage.setItem('theme', enabled ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', enabled);
    
    toast({
      title: `${enabled ? 'Dark' : 'Light'} mode enabled`,
      description: `Switched to ${enabled ? 'dark' : 'light'} theme.`,
    });
  };

  const clearAllData = async () => {
    try {
      // Clear localStorage data but preserve theme
      const currentTheme = localStorage.getItem('theme');
      localStorage.clear();
      if (currentTheme) {
        localStorage.setItem('theme', currentTheme);
      }
      
      // Clear PDF files on mobile
      if (Capacitor.isNativePlatform()) {
        try {
          const files = await Filesystem.readdir({
            path: '',
            directory: Directory.Documents
          });
          
          // Delete all PDF files
          for (const file of files.files) {
            if (file.name.toLowerCase().endsWith('.pdf')) {
              await Filesystem.deleteFile({
                path: file.name,
                directory: Directory.Documents
              });
            }
          }
        } catch (error) {
          console.log('No files to clear or error accessing files:', error);
        }
      }
      
      toast({
        title: "Data Cleared",
        description: "All app data and PDFs have been successfully cleared.",
      });
      
      // Close dialog and navigate back
      setIsConfirmOpen(false);
      onNavigate('dashboard');
      
      // Refresh the page to reset the app state
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: "Failed to clear some data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveBackupSettings = () => {
    const cfg = { mode: backupMode, frequency: backupFrequency, lastRunAt: lastBackupAt };
    saveBackupConfig(cfg);
    initAutoBackup();
    toast({ title: 'Backup settings saved', description: `Mode: ${backupMode}, Frequency: ${backupFrequency}` });
  };

  const handleManualBackup = async () => {
    const password = prompt('Optional: Set a password to encrypt the backup (leave blank for none)') || undefined;
    const result = await runBackupNow(password);
    setLastBackupAt(new Date().toISOString());
    toast({ title: result.success ? 'Backup complete' : 'Backup failed', description: result.message, variant: result.success ? 'default' : 'destructive' });
  };

  const handleRestore = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const password = prompt('If backup is encrypted, enter password (leave blank if not encrypted)') || undefined;
        const res = await restoreBackupFromBlob(file, password);
        toast({ title: res.success ? 'Restore complete' : 'Restore failed', description: res.message, variant: res.success ? 'default' : 'destructive' });
        if (res.success) setTimeout(() => window.location.reload(), 800);
      };
      input.click();
    } catch (e) {
      toast({ title: 'Restore failed', description: 'Could not restore backup', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft to-accent-soft p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Appearance Settings */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the app looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Dark Mode</label>
                  <p className="text-xs text-muted-foreground">
                    Switch between light and dark themes
                  </p>
                </div>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={toggleDarkMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Manage your application data and storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => setIsConfirmOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Data
                </Button>
                <p className="text-xs text-muted-foreground">
                  This will permanently delete all customers, bills, payments, items, and PDF files
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Backup Settings */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Backup
              </CardTitle>
              <CardDescription>
                Configure automatic backups and create manual backups. Backups can be saved to OneDrive via Share.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Mode</label>
                  <div className="mt-1 flex gap-2">
                    <Button variant={backupMode === 'automatic' ? 'default' : 'outline'} onClick={() => setBackupMode('automatic')}>Automatic</Button>
                    <Button variant={backupMode === 'manual' ? 'default' : 'outline'} onClick={() => setBackupMode('manual')}>Manual</Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Frequency</label>
                  <div className="mt-1 flex gap-2">
                    <Button variant={backupFrequency === 'daily' ? 'default' : 'outline'} onClick={() => setBackupFrequency('daily')}>Daily</Button>
                    <Button variant={backupFrequency === 'weekly' ? 'default' : 'outline'} onClick={() => setBackupFrequency('weekly')}>Weekly</Button>
                    <Button variant={backupFrequency === 'monthly' ? 'default' : 'outline'} onClick={() => setBackupFrequency('monthly')}>Monthly</Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Manual Backup</label>
                  <div className="mt-1">
                    <div className="flex gap-2">
                      <Button className="w-full" onClick={handleManualBackup}>Create Backup Now</Button>
                      <Button variant="outline" onClick={handleRestore}>Restore</Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="w-4 h-4" />
                  <span>Last Backup: {lastBackupAt ? new Date(lastBackupAt).toLocaleString() : 'Never'}</span>
                </div>
                <Button variant="outline" onClick={saveBackupSettings}>Save Backup Settings</Button>
              </div>
            </CardContent>
          </Card>

          {/* Cloud Sync & Auth */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Cloud Sync
              </CardTitle>
              <CardDescription>
                Sign in with Google or Microsoft and sync your data across devices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {cloudUser ? (
                    <>
                      <div className="font-medium">{cloudUser.displayName}</div>
                      <div className="text-muted-foreground">{cloudUser.email} • {cloudUser.provider}</div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">Not signed in</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {!cloudUser ? (
                    <>
                      <Button variant="outline" onClick={async () => { try { const u = await signInWithGoogle(); setCloudUser(u); initCloudSync(); toast({ title: 'Signed in', description: `Welcome ${u.displayName}` }); await syncDown(); } catch {} }}> <LogIn className="w-4 h-4 mr-2" /> Google</Button>
                      <Button variant="outline" onClick={async () => { try { const u = await signInWithMicrosoft(); setCloudUser(u); initCloudSync(); toast({ title: 'Signed in', description: `Welcome ${u.displayName}` }); await syncDown(); } catch {} }}> <LogIn className="w-4 h-4 mr-2" /> Microsoft</Button>
                    </>
                  ) : (
                    <Button variant="destructive" onClick={() => { signOut(); setCloudUser(null); toast({ title: 'Signed out' }); }}> <LogOut className="w-4 h-4 mr-2" /> Logout</Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={async () => { const r = await syncDown(); toast({ title: r.success ? 'Sync Down' : 'Sync Failed', description: r.message, variant: r.success ? 'default' : 'destructive' }); }} disabled={!cloudUser}>Sync From Cloud</Button>
                <Button variant="outline" onClick={async () => { const r = await syncUp(); toast({ title: r.success ? 'Sync Up' : 'Sync Failed', description: r.message, variant: r.success ? 'default' : 'destructive' }); }} disabled={!cloudUser}>Sync To Cloud</Button>
              </div>
              <p className="text-xs text-muted-foreground">Note: This demo uses a local mock for cloud storage. Replace with Firebase/OneDrive integration in production.</p>
            </CardContent>
          </Card>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Confirm Data Deletion
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to clear all data? This action will permanently delete:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All customers</li>
                  <li>All bills</li>
                  <li>All payments</li>
                  <li>All items</li>
                  <li>All PDF files stored on device</li>
                </ul>
                <strong className="text-destructive">This action cannot be undone.</strong>
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setIsConfirmOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={clearAllData}
                className="w-full sm:w-auto"
              >
                Yes, Clear All Data
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};