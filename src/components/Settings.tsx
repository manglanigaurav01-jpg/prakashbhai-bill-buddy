import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeft, Moon, Sun, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface SettingsProps {
  onNavigate: (view: string) => void;
}

export const Settings = ({ onNavigate }: SettingsProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { toast } = useToast();

  // Check for existing dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
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