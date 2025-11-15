import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeft, Moon, Sun, Trash2, User } from "lucide-react";
import { getCurrentUser, signInWithGoogle, signOutUser, onAuthStateChanged } from '@/lib/auth';
import { AutoSync } from "./AutoSync";
import { useToast } from "@/hooks/use-toast";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { BackupManager } from "./BackupManager";
import { isPasswordSet, setPassword, verifyPassword, changePassword, removePassword } from '@/components/password';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initializeAutoBackup } from '@/lib/auto-backup';
import type { User } from 'firebase/auth';

interface SettingsProps {
  onNavigate: (view: string) => void;
}

export const Settings = ({ onNavigate }: SettingsProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { toast } = useToast();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordEnabled, setPasswordEnabled] = useState(isPasswordSet());
  const [passwordAction, setPasswordAction] = useState<'set' | 'change' | 'remove' | 'confirmClear'>('set');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Check for existing dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        // Initialize auto backup when user signs in
        initializeAutoBackup();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      // Add a safety timeout to ensure loading state is reset
      const timeoutId = setTimeout(() => {
        setIsSigningIn(false);
        toast({
          title: "Sign-in timeout",
          description: "The sign-in process is taking too long. Please try again.",
          variant: "destructive",
        });
      }, 90000); // 90 second safety timeout

      const result = await signInWithGoogle();
      
      clearTimeout(timeoutId);
      
      if (result.success) {
        toast({
          title: "Signed in successfully",
          description: "Your account is now connected. Monthly backups will be automatic.",
        });
        initializeAutoBackup();
      } else {
        toast({
          title: "Sign in failed",
          description: result.error || "Failed to sign in with Google",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Sign-in error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        toast({
          title: "Signed out",
          description: "You have been signed out successfully.",
        });
      } else {
        toast({
          title: "Sign out failed",
          description: result.error || "Failed to sign out",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    }
  };

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
            directory: 'DOCUMENTS' as Directory
          });
          
          // Delete all PDF files
          for (const file of files.files) {
            if (file.name.toLowerCase().endsWith('.pdf')) {
              await Filesystem.deleteFile({
                path: file.name,
                directory: 'DOCUMENTS' as Directory
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
      setShowPasswordDialog(false);
      setPasswordInput('');
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

  const handleClearDataClick = () => {
    if (isPasswordSet()) {
      setPasswordAction('confirmClear');
      setShowPasswordDialog(true);
    } else {
      setIsConfirmOpen(true);
    }
  };

  const handlePasswordDialogSubmit = () => {
    switch (passwordAction) {
      case 'confirmClear':
        if (verifyPassword(passwordInput)) {
          clearAllData();
        } else {
          toast({ title: "Incorrect Password", description: "The password you entered is incorrect.", variant: "destructive" });
        }
        break;
      case 'set':
        if (newPassword !== confirmNewPassword) {
          toast({ title: "Passwords don't match", variant: "destructive" });
          return;
        }
        const setResult = setPassword(newPassword);
        toast({ title: setResult.success ? "Password Set" : "Error", description: setResult.message, variant: setResult.success ? "default" : "destructive" });
        if (setResult.success) {
          setPasswordEnabled(true);
          setShowPasswordDialog(false);
          resetPasswordFields();
        }
        break;
      case 'change':
        if (newPassword !== confirmNewPassword) {
          toast({ title: "New passwords don't match", variant: "destructive" });
          return;
        }
        const changeResult = changePassword(currentPassword, newPassword);
        toast({ title: changeResult.success ? "Password Changed" : "Error", description: changeResult.message, variant: changeResult.success ? "default" : "destructive" });
        if (changeResult.success) {
          setShowPasswordDialog(false);
          resetPasswordFields();
        }
        break;
      case 'remove':
        const removeResult = removePassword(currentPassword);
        toast({ title: removeResult.success ? "Password Removed" : "Error", description: removeResult.message, variant: removeResult.success ? "default" : "destructive" });
        if (removeResult.success) {
          setPasswordEnabled(false);
          setShowPasswordDialog(false);
          resetPasswordFields();
        }
        break;
    }
  };

  const resetPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordInput('');
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
                  onClick={handleClearDataClick}
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

          {/* Security Settings */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Security
              </CardTitle>
              <CardDescription>
                Protect sensitive actions with a password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordEnabled ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setPasswordAction('change'); setShowPasswordDialog(true); }}>Change Password</Button>
                  <Button variant="destructive" onClick={() => { setPasswordAction('remove'); setShowPasswordDialog(true); }}>Remove Password</Button>
                </div>
              ) : (
                <Button onClick={() => { setPasswordAction('set'); setShowPasswordDialog(true); }}>
                  Set 4-Digit Password
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                This password will be required to clear all data.
              </p>
            </CardContent>
          </Card>

          {/* Google Sign-in & Auto Backup */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Google Account & Auto Backup
              </CardTitle>
              <CardDescription>
                Sign in with Google to enable automatic monthly backups at month end
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentUser ? (
                <div className="space-y-3">
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-sm font-medium">Signed in as:</p>
                    <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ✓ Automatic backups will be created at the end of each month
                  </p>
                  <Button variant="outline" onClick={handleSignOut} className="w-full">
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in with Google to enable automatic monthly backups. Backups will be created automatically at the end of each month.
                  </p>
                  <Button 
                    onClick={handleGoogleSignIn} 
                    disabled={isSigningIn}
                    className="w-full"
                  >
                    {isSigningIn ? "Signing in..." : "Sign in with Google"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Note: You can use the app without signing in. You can sign in later from here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Backup System */}
          <BackupManager />

          {/* Recycle Bin Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Recycle Bin
              </CardTitle>
              <CardDescription>
                View and manage deleted items. Items are kept for 30 days before permanent deletion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => onNavigate('recycleBin')}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Open Recycle Bin
              </Button>
            </CardContent>
          </Card>

          {/* Auto Cloud Sync */}
          <AutoSync />
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

        {/* Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {passwordAction === 'set' && 'Set New Password'}
                {passwordAction === 'change' && 'Change Password'}
                {passwordAction === 'remove' && 'Remove Password Protection'}
                {passwordAction === 'confirmClear' && 'Enter Password to Clear Data'}
              </DialogTitle>
              <DialogDescription>
                {passwordAction === 'set' && 'Create a 4-digit numeric password.'}
                {passwordAction === 'change' && 'Enter your current and new password.'}
                {passwordAction === 'remove' && 'Enter your current password to remove protection.'}
                {passwordAction === 'confirmClear' && 'This is a destructive action. Please confirm.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {(passwordAction === 'change' || passwordAction === 'remove') && (
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
              )}
              {(passwordAction === 'set' || passwordAction === 'change') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New 4-Digit Password</Label>
                    <Input id="new-password" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <Input id="confirm-new-password" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                  </div>
                </>
              )}
              {passwordAction === 'confirmClear' && (
                <div className="space-y-2">
                  <Label htmlFor="password-input">Enter 4-Digit Password</Label>
                  <Input id="password-input" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowPasswordDialog(false); resetPasswordFields(); }}>Cancel</Button>
              <Button
                onClick={handlePasswordDialogSubmit}
                variant={passwordAction === 'confirmClear' || passwordAction === 'remove' ? 'destructive' : 'default'}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};