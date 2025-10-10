import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Calculator, CreditCard, TrendingUp, Package, Settings as SettingsIcon, Edit3, Sun, Moon, BarChart, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { GlobalSearch } from "@/components/GlobalSearch";

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    setIsDarkMode(shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  const menuItems = [
    { icon: FileText, label: "Create Bill", view: "createBill" },
    { icon: Users, label: "Customers", view: "customers" },
    { icon: Calculator, label: "Last Balance", view: "lastBalance" },
    { icon: BarChart, label: "L/B History", view: "balanceHistory" },
    { icon: CreditCard, label: "Payments", view: "editPayments" },
    { icon: Package, label: "Items", view: "itemMaster" },
    { icon: Edit3, label: "Edit Bills", view: "editBills" },
    { icon: TrendingUp, label: "Analytics", view: "analytics" },
    { icon: SettingsIcon, label: "Settings", view: "settings" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft to-accent-soft p-8">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">Prakashbhai</h1>
            <p className="text-business-gray text-lg">Bill Manager</p>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGlobalSearch(true)}
              className="transition-all duration-200 hover:scale-105"
            >
              <Search className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="transition-all duration-200 hover:scale-105"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('settings')}
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
        
        <GlobalSearch 
          open={showGlobalSearch} 
          onOpenChange={setShowGlobalSearch}
          onNavigate={onNavigate}
        />
        
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('createBill')}
              >
                <FileText className="w-8 h-8" />
                <span className="text-sm font-medium">Create a Bill</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-accent hover:text-accent-foreground transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('amountTracker')}
              >
                <Calculator className="w-8 h-8" />
                <span className="text-sm font-medium">Amount Paid/Not Paid</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-warning hover:text-warning-foreground transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('lastBalance')}
              >
                <CreditCard className="w-8 h-8" />
                <span className="text-sm font-medium">Last Balance</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-purple-500 hover:text-white transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('balanceHistory')}
              >
                <BarChart className="w-8 h-8" />
                <span className="text-sm font-medium">L/B History</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-business-blue hover:text-primary-foreground transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('totalBusiness')}
              >
                <TrendingUp className="w-8 h-8" />
                <span className="text-sm font-medium">Total Business</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-orange-500 hover:text-white transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('itemMaster')}
              >
                <Package className="w-8 h-8" />
                <span className="text-sm font-medium">Item Master</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-indigo-500 hover:text-white transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('analytics')}
              >
                <BarChart className="w-8 h-8" />
                <span className="text-sm font-medium">Analytics</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-business-blue hover:text-primary-foreground transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('customers')}
              >
                <Users className="w-8 h-8" />
                <span className="text-sm font-medium">Customers</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-purple-500 hover:text-white transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('editBills')}
              >
                <Edit3 className="w-8 h-8" />
                <span className="text-sm font-medium">Edit Bills</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-emerald-500 hover:text-white transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('editPayments')}
              >
                <CreditCard className="w-8 h-8" />
                <span className="text-sm font-medium">Edit Amt Paid</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};