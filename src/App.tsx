import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LogPage from "./pages/LogPage";
import MapPage from "./pages/MapPage";
import CalendarPage from "./pages/CalendarPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import NotFound from "./pages/NotFound";
import { BottomNav } from "./components/BottomNav";
import { useEffect } from "react";
import { seedDatabase } from "./db/seed";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/log" element={<LogPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
