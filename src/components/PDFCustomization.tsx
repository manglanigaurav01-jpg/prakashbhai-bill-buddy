import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface PDFSettings {
  headerColor: string;
  textColor: string;
  companyName: string;
  srNoHeader: string;
  itemNameHeader: string;
  quantityHeader: string;
  rateHeader: string;
  totalHeader: string;
}

const DEFAULT_SETTINGS: PDFSettings = {
  headerColor: '#1e40af',
  textColor: '#000000',
  companyName: 'Prakash Bhai Bill Buddy',
  srNoHeader: 'Sr No',
  itemNameHeader: 'Item Name',
  quantityHeader: 'Quantity',
  rateHeader: 'Rate',
  totalHeader: 'Total',
};

interface PDFCustomizationProps {
  onNavigate: (view: string) => void;
}

export const PDFCustomization = ({ onNavigate }: PDFCustomizationProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PDFSettings>(() => {
    const saved = localStorage.getItem('pdf_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const handleSave = () => {
    localStorage.setItem('pdf_settings', JSON.stringify(settings));
    toast({
      title: 'Settings Saved',
      description: 'PDF customization settings have been saved',
    });
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('pdf_settings');
    toast({
      title: 'Settings Reset',
      description: 'PDF settings reset to default',
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate('settings')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">PDF Customization</h1>
            <p className="text-muted-foreground">Customize your bill PDF appearance</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Colors</CardTitle>
            <CardDescription>Customize PDF colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Header Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.headerColor}
                    onChange={(e) => setSettings({ ...settings, headerColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={settings.headerColor}
                    onChange={(e) => setSettings({ ...settings, headerColor: e.target.value })}
                    placeholder="#1e40af"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={settings.textColor}
                    onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Customize business name</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="Your Company Name"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Table Headers</CardTitle>
            <CardDescription>Customize table column names</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Sr No Header</Label>
                <Input
                  value={settings.srNoHeader}
                  onChange={(e) => setSettings({ ...settings, srNoHeader: e.target.value })}
                  placeholder="Sr No"
                />
              </div>

              <div className="space-y-2">
                <Label>Item Name Header</Label>
                <Input
                  value={settings.itemNameHeader}
                  onChange={(e) => setSettings({ ...settings, itemNameHeader: e.target.value })}
                  placeholder="Item Name"
                />
              </div>

              <div className="space-y-2">
                <Label>Quantity Header</Label>
                <Input
                  value={settings.quantityHeader}
                  onChange={(e) => setSettings({ ...settings, quantityHeader: e.target.value })}
                  placeholder="Quantity"
                />
              </div>

              <div className="space-y-2">
                <Label>Rate Header</Label>
                <Input
                  value={settings.rateHeader}
                  onChange={(e) => setSettings({ ...settings, rateHeader: e.target.value })}
                  placeholder="Rate"
                />
              </div>

              <div className="space-y-2">
                <Label>Total Header</Label>
                <Input
                  value={settings.totalHeader}
                  onChange={(e) => setSettings({ ...settings, totalHeader: e.target.value })}
                  placeholder="Total"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
          <Button onClick={handleReset} variant="outline" className="flex-1">
            Reset to Default
          </Button>
        </div>
      </div>
    </div>
  );
};
