import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "@/components/Dashboard";
import { CreateBill } from "@/components/CreateBill";
import { EnhancedCreateBill } from "@/components/EnhancedCreateBill";
import { Customers } from "@/components/Customers";
import { BalanceTracker } from "@/components/BalanceTracker";
import { AmountTracker } from "@/components/AmountTracker";
import { LastBalance } from "@/components/LastBalance";
import { TotalBusiness } from "@/components/TotalBusiness";
import { ItemMaster } from "@/components/ItemMaster";
import { Settings } from "@/components/Settings";
import { EditBills } from "@/components/EditBills";
import { EditPayments } from "@/components/EditPayments";
import { EnhancedAnalytics } from "@/components/EnhancedAnalytics";
import { BalanceHistory } from "@/components/BalanceHistory";
import { RecycleBin } from "@/components/RecycleBin";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/OfflineIndicator";

const queryClient = new QueryClient();

type View = 'dashboard' | 'createBill' | 'customers' | 'balance' | 'amountTracker' | 'lastBalance' | 'balanceHistory' | 'totalBusiness' | 'itemMaster' | 'editBills' | 'editPayments' | 'settings' | 'analytics' | 'recycleBin';

const App = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // Initialize theme on app start
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const handleNavigate = (view: string) => {
    setCurrentView(view as View);
  };

  const renderView = () => {
    switch (currentView) {
      case 'createBill':
        return <EnhancedCreateBill onNavigate={handleNavigate} />;
      case 'customers':
        return <Customers onNavigate={handleNavigate} />;
      case 'balance':
        return <BalanceTracker onNavigate={handleNavigate} />;
      case 'amountTracker':
        return <AmountTracker onNavigate={handleNavigate} />;
      case 'lastBalance':
        return <LastBalance onNavigate={handleNavigate} />;
      case 'totalBusiness':
        return <TotalBusiness onNavigate={handleNavigate} />;
      case 'itemMaster':
        return <ItemMaster onNavigate={handleNavigate} />;
      case 'editBills':
        return <EditBills onNavigate={handleNavigate} />;
      case 'editPayments':
        return <EditPayments onNavigate={handleNavigate} />;
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
      case 'analytics':
        return <EnhancedAnalytics onNavigate={handleNavigate} />;
      case 'balanceHistory':
        return <BalanceHistory onNavigate={handleNavigate} />;
      case 'recycleBin':
        return <RecycleBin onNavigate={handleNavigate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          {renderView()}
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
