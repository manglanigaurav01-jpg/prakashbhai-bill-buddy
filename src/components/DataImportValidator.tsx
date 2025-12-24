import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertTriangle, Users, Receipt, CreditCard, Package } from 'lucide-react';
import { checkDataConsistency } from '@/lib/validation';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportPreview {
  customers: number;
  bills: number;
  payments: number;
  items: number;
  errors: string[];
  warnings: string[];
  orphanedBills: string[];
  orphanedPayments: string[];
  isValid: boolean;
}

interface DataImportValidatorProps {
  fileContent: string;
  onValidate: (isValid: boolean) => void;
  onImport: (data: any) => Promise<void>;
  onCancel: () => void;
}

export const DataImportValidator: React.FC<DataImportValidatorProps> = ({
  fileContent,
  onValidate,
  onImport,
  onCancel
}) => {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const validateData = useCallback(async () => {
    try {
      const data = JSON.parse(fileContent);
      
      // Basic structure validation
      const consistencyCheck = checkDataConsistency(data);
      
      // Enhanced integrity check
      const errors: string[] = [...(consistencyCheck.errors || [])];
      const warnings: string[] = [];
      const orphanedBills: string[] = [];
      const orphanedPayments: string[] = [];

      // Check for orphaned bills
      if (data.bills && data.customers) {
        const customerIds = new Set(data.customers.map((c: any) => c.id));
        data.bills.forEach((bill: any) => {
          if (!bill.customerId || !customerIds.has(bill.customerId)) {
            orphanedBills.push(bill.id || 'unknown');
            errors.push(`Bill ${bill.id || 'unknown'} references non-existent customer`);
          }
        });
      }

      // Check for orphaned payments
      if (data.payments && data.customers) {
        const customerIds = new Set(data.customers.map((c: any) => c.id));
        data.payments.forEach((payment: any) => {
          if (!payment.customerId || !customerIds.has(payment.customerId)) {
            orphanedPayments.push(payment.id || 'unknown');
            errors.push(`Payment ${payment.id || 'unknown'} references non-existent customer`);
          }
        });
      }

      // Check for duplicate IDs
      const billIds = new Set<string>();
      const duplicateBills: string[] = [];
      data.bills?.forEach((bill: any) => {
        if (bill.id && billIds.has(bill.id)) {
          duplicateBills.push(bill.id);
        }
        billIds.add(bill.id);
      });
      if (duplicateBills.length > 0) {
        warnings.push(`Found ${duplicateBills.length} duplicate bill IDs`);
      }

      const preview: ImportPreview = {
        customers: data.customers?.length || 0,
        bills: data.bills?.length || 0,
        payments: data.payments?.length || 0,
        items: data.items?.length || 0,
        errors,
        warnings,
        orphanedBills,
        orphanedPayments,
        isValid: errors.length === 0
      };

      setPreview(preview);
      onValidate(preview.isValid);
      setIsValidating(false);
    } catch (error) {
      setPreview({
        customers: 0,
        bills: 0,
        payments: 0,
        items: 0,
        errors: ['Invalid JSON format: ' + (error instanceof Error ? error.message : String(error))],
        warnings: [],
        orphanedBills: [],
        orphanedPayments: [],
        isValid: false
      });
      onValidate(false);
      setIsValidating(false);
    }
  }, [fileContent, onValidate]);

  useEffect(() => {
    validateData();
  }, [validateData]);

  const handleImport = async () => {
    if (!preview?.isValid) return;
    
    setIsImporting(true);
    try {
      const data = JSON.parse(fileContent);
      await onImport(data);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Data Preview</DialogTitle>
          <DialogDescription>
            Review the data before importing. Fix any errors before proceeding.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isValidating ? (
            <div className="text-center py-8">Validating data...</div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Data Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{preview.customers}</p>
                        <p className="text-xs text-muted-foreground">Customers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{preview.bills}</p>
                        <p className="text-xs text-muted-foreground">Bills</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-2xl font-bold">{preview.payments}</p>
                        <p className="text-xs text-muted-foreground">Payments</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold">{preview.items}</p>
                        <p className="text-xs text-muted-foreground">Items</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Status */}
              <Alert variant={preview.isValid ? "default" : "destructive"}>
                {preview.isValid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Data is valid and ready to import
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      {preview.errors.length} error(s) found. Please fix these before importing.
                    </AlertDescription>
                  </>
                )}
              </Alert>

              {/* Errors */}
              {preview.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-destructive">Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {preview.errors.slice(0, 10).map((error, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </li>
                      ))}
                      {preview.errors.length > 10 && (
                        <li className="text-muted-foreground">
                          ... and {preview.errors.length - 10} more errors
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-warning">Warnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {preview.warnings.map((warning, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={isImporting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!preview?.isValid || isImporting}
            className="w-full sm:w-auto"
          >
            {isImporting ? 'Importing...' : 'Import Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

