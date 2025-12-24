import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Calculator, CreditCard, TrendingUp, Package, Settings as SettingsIcon, Edit3, Sun, Moon, BarChart, Search } from "lucide-react";
import { useState } from "react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useTheme } from "@/lib/theme-manager";

export interface DashboardProps {
  onNavigate: (view: string) => void;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { effectiveTheme, toggleTheme } = useTheme();
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const isDarkMode = effectiveTheme === 'dark';

  // Menu items are defined inline in the JSX below

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft to-accent-soft p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4 sm:mb-6 lg:mb-8">
          <div className="flex-1"></div>
          <div className="text-center flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-1 sm:mb-2">Prakashbhai</h1>
            <p className="text-business-gray text-sm sm:text-base md:text-lg">Bill Manager</p>
          </div>
          <div className="flex gap-2 flex-1 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGlobalSearch(true)}
              className="transition-all duration-200 hover:scale-105 flex-1 sm:flex-none px-3 sm:px-4"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Search</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="transition-all duration-200 hover:scale-105 flex-1 sm:flex-none px-3 sm:px-4"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline ml-2">{isDarkMode ? 'Light' : 'Dark'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('settings')}
              className="flex-1 sm:flex-none px-3 sm:px-4"
            >
              <SettingsIcon className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>

        <GlobalSearch
          open={showGlobalSearch}
          onOpenChange={setShowGlobalSearch}
          onNavigate={onNavigate}
        />

        <Card className="shadow-lg">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
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