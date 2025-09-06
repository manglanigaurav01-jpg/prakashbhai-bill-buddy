import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface SettingsProps {
  onNavigate: (view: string) => void;
}

export const Settings = ({ onNavigate }: SettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { toast } = useToast();

  const clearAllData = async () => {
    try {
      // Clear localStorage data
      localStorage.clear();
      
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
      
      // Close dialogs and navigate back
      setIsConfirmOpen(false);
      setIsOpen(false);
      onNavigate('dashboard');
      
      // Refresh the page to reset the app state
      window.location.reload();
      
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
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your application settings and data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => setIsConfirmOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
};