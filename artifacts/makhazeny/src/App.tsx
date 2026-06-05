import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WarehouseAppShell } from "@/components/warehouse-app-shell";
import { LanguageProvider } from "@/lib/i18n";
import { DateProvider } from "@/lib/date-context";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import CustomersPage from "@/pages/customers";
import SuppliersPage from "@/pages/suppliers";
import SalesPage from "@/pages/sales";
import DebtsPage from "@/pages/debts";
import ReturnsPage from "@/pages/returns";
import TreasuryPage from "@/pages/treasury";
import ReportsPage from "@/pages/reports";

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        {() => (
          <WarehouseAppShell>
            <Switch>
              <Route path="/" component={DashboardPage} />
              <Route path="/products" component={ProductsPage} />
              <Route path="/customers" component={CustomersPage} />
              <Route path="/suppliers" component={SuppliersPage} />
              <Route path="/sales" component={SalesPage} />
              <Route path="/debts" component={DebtsPage} />
              <Route path="/returns" component={ReturnsPage} />
              <Route path="/treasury" component={TreasuryPage} />
              <Route path="/reports" component={ReportsPage} />
              <Route component={NotFound} />
            </Switch>
          </WarehouseAppShell>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <LanguageProvider>
      <DateProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </DateProvider>
    </LanguageProvider>
  );
}

export default App;
