import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, RotateCcw, Clock, Package, FileText, DollarSign, ArrowLeft } from 'lucide-react';
import { getRecycleBin, restoreFromRecycleBin, permanentlyDelete, clearRecycleBin, getDaysRemaining, cleanupOldItems, RecycledItem } from '@/lib/recycle-bin';
import { useToast } from '@/hooks/use-toast';

interface RecycleBinProps {
  onNavigate: (view: string) => void;
}

export const RecycleBin = ({ onNavigate }: RecycleBinProps) => {
  const [recycleBin, setRecycleBin] = useState<RecycledItem[]>([]);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const loadRecycleBin = () => {
    const cleaned = cleanupOldItems();
    if (cleaned > 0) {
      toast({
        title: 'Auto-cleanup',
        description: `${cleaned} item(s) older than 30 days were permanently deleted`,
      });
    }
    setRecycleBin(getRecycleBin());
  };

  useEffect(() => {
    loadRecycleBin();
  }, []);

  const handleRestore = (itemId: string) => {
    const success = restoreFromRecycleBin(itemId);
    if (success) {
      toast({
        title: 'Item Restored',
        description: 'The item has been restored successfully',
      });
      loadRecycleBin();
    } else {
      toast({
        title: 'Restore Failed',
        description: 'Could not restore the item',
        variant: 'destructive',
      });
    }
  };

  const handlePermanentDelete = (itemId: string) => {
    const success = permanentlyDelete(itemId);
    if (success) {
      toast({
        title: 'Permanently Deleted',
        description: 'The item has been permanently deleted',
      });
      loadRecycleBin();
      setConfirmDelete(null);
    }
  };

  const handleClearAll = () => {
    clearRecycleBin();
    toast({
      title: 'Recycle Bin Cleared',
      description: 'All items have been permanently deleted',
    });
    setRecycleBin([]);
    setConfirmClearAll(false);
  };

  const getIcon = (type: RecycledItem['type']) => {
    switch (type) {
      case 'customer':
        return <Package className="h-5 w-5" />;
      case 'bill':
        return <FileText className="h-5 w-5" />;
      case 'payment':
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: RecycledItem['type']) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft to-accent-soft p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('settings')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Recycle Bin
                </CardTitle>
                <CardDescription>
                  Deleted items are kept for 30 days before permanent deletion
                </CardDescription>
              </div>
              {recycleBin.length > 0 && (
                <Button variant="destructive" onClick={() => setConfirmClearAll(true)}>
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
        <CardContent>
          {recycleBin.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Recycle bin is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recycleBin.map((item) => {
                const daysRemaining = getDaysRemaining(item.deletedAt);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-muted-foreground">
                        {getIcon(item.type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.displayName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                            {getTypeLabel(item.type)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item.id)}
                        className="gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmDelete(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Recycle Bin?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {recycleBin.length} item(s) in the recycle bin. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this item. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handlePermanentDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
};
