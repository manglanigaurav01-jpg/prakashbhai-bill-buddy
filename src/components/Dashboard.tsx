import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Calculator, CreditCard } from "lucide-react";

interface DashboardProps {
  onNavigate: (view: 'create-bill' | 'customers' | 'balance' | 'dashboard') => void;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft to-accent-soft p-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Prakashbhai</h1>
          <p className="text-business-gray text-lg">Bill Manager</p>
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
                onClick={() => onNavigate('balance')}
              >
                <Calculator className="w-8 h-8" />
                <span className="text-sm font-medium">Amount Paid/Not Paid</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex-col gap-3 hover:bg-warning hover:text-warning-foreground transition-all duration-300 hover:scale-105"
                onClick={() => onNavigate('balance')}
              >
                <CreditCard className="w-8 h-8" />
                <span className="text-sm font-medium">Last Balance</span>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};