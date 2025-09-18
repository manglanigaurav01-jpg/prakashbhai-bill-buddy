import { useState } from "react";
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

const queryClient = new QueryClient();

type View = 'dashboard' | 'create-bill' | 'customers' | 'balance' | 'amount-tracker' | 'last-balance' | 'total-business' | 'item-master' | 'edit-bills' | 'settings';

const App = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');

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
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {renderView()}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
