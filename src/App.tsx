import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { RazorpayProvider } from "@/contexts/RazorpayContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import Models from "./pages/Models";
import ModelDetail from "./pages/models/ModelDetail";
import Login from "./pages/login/Login";
import Jobs from "./pages/Jobs";
import Profile from "./pages/Profile";
import Account from "./pages/Account";
import Contact from "./pages/Contact";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="phage-ui-theme">
      <AuthProvider>
        <RazorpayProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/models" element={<Models />} />
              <Route path="/models/:modelId" element={<ModelDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/account" element={<Account />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </RazorpayProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
