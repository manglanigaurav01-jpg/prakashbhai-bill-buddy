import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Calculator, CreditCard, TrendingUp, Package, Settings as SettingsIcon, Edit3, Sun, Moon, BarChart } from "lucide-react";
import { useState, useEffect } from "react";

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

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
        
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('create-bill')}
              >
                <FileText className="w-8 h-8" />
                <span className="text-sm font-medium">Create a Bill</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-accent hover:text-accent-foreground transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('amount-tracker')}
              >
                <Calculator className="w-8 h-8" />
                <span className="text-sm font-medium">Amount Paid/Not Paid</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-warning hover:text-warning-foreground transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('last-balance')}
              >
                <CreditCard className="w-8 h-8" />
                <span className="text-sm font-medium">Last Balance</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-business-blue hover:text-primary-foreground transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('total-business')}
              >
                <TrendingUp className="w-8 h-8" />
                <span className="text-sm font-medium">Total Business</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-orange-500 hover:text-white transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('item-master')}
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
                onClick={() => onNavigate('edit-bills')}
              >
                <Edit3 className="w-8 h-8" />
                <span className="text-sm font-medium">Edit Bills</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-emerald-500 hover:text-white transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('edit-payments')}
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