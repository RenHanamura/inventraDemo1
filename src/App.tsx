import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { LocationProvider } from "@/contexts/LocationContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Movements from "@/pages/Movements";
import Locations from "@/pages/Locations";
import Suppliers from "@/pages/Suppliers";
import Settings from "@/pages/Settings";
import AuditLogs from "@/pages/AuditLogs";
import ReportManager from "@/pages/ReportManager";
import TeamManagement from "@/pages/TeamManagement";
import Auth from "@/pages/Auth";
import NotFound from "./pages/NotFound";
import ProductScan from "./pages/ProductScan";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <LocationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/scan" element={<ProductScan />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/movements" element={<Movements />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/suppliers" element={<Suppliers />} />
                    <Route path="/audit-logs" element={<AuditLogs />} />
                    <Route path="/reports" element={<ReportManager />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/team" element={<TeamManagement />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </LocationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
