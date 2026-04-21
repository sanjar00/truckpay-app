
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Root entry: in production Netlify rewrites "/" to /landing.html before React loads,
// so this only runs in local dev or edge cases. Logged-in users go to /dashboard;
// everyone else is sent to the static landing page.
const RootGate = () => {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) {
      window.location.replace('/landing.html');
    }
  }, [user, loading]);
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootGate />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/dashboard/*" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
