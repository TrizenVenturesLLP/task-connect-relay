import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { lazy, Suspense } from "react";

const queryClient = new QueryClient();

const lazyLoad = (loader: () => Promise<{ default: React.ComponentType<any> }>) => {
  const C = lazy(loader);
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <C />
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={lazyLoad(() => import("./pages/auth/Login"))} />
          <Route path="/auth/signup" element={lazyLoad(() => import("./pages/auth/Signup"))} />
          <Route path="/auth/forgot-password" element={lazyLoad(() => import("./pages/auth/ForgotPassword"))} />
          <Route path="/auth/verify-phone" element={lazyLoad(() => import("./pages/auth/VerifyPhone"))} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
