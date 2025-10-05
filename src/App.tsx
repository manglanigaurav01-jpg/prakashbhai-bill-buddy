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
import { Analytics } from "@/components/Analytics";
import { PDFCustomization } from "@/components/PDFCustomization";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

type View = 'dashboard' | 'create-bill' | 'customers' | 'balance' | 'amount-tracker' | 'last-balance' | 'total-business' | 'item-master' | 'edit-bills' | 'edit-payments' | 'settings' | 'analytics' | 'pdf-customization';

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
      case 'create-bill':
        return <EnhancedCreateBill onNavigate={handleNavigate} />;
      case 'customers':
        return <Customers onNavigate={handleNavigate} />;
      case 'balance':
        return <BalanceTracker onNavigate={handleNavigate} />;
      case 'amount-tracker':
        return <AmountTracker onNavigate={handleNavigate} />;
      case 'last-balance':
        return <LastBalance onNavigate={handleNavigate} />;
      case 'total-business':
        return <TotalBusiness onNavigate={handleNavigate} />;
      case 'item-master':
        return <ItemMaster onNavigate={handleNavigate} />;
      case 'edit-bills':
        return <EditBills onNavigate={handleNavigate} />;
      case 'edit-payments':
        return <EditPayments onNavigate={handleNavigate} />;
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
      case 'analytics':
        return <Analytics onNavigate={handleNavigate} />;
      case 'pdf-customization':
        return <PDFCustomization onNavigate={handleNavigate} />;
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
          {renderView()}
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
