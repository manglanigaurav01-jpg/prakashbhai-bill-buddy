import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "@/components/Dashboard";
import { CreateBill } from "@/components/CreateBill";
import { Customers } from "@/components/Customers";
import { BalanceTracker } from "@/components/BalanceTracker";

const queryClient = new QueryClient();

type View = 'dashboard' | 'create-bill' | 'customers' | 'balance';

const App = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'create-bill':
        return <CreateBill onNavigate={setCurrentView} />;
      case 'customers':
        return <Customers onNavigate={setCurrentView} />;
      case 'balance':
        return <BalanceTracker onNavigate={setCurrentView} />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
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
