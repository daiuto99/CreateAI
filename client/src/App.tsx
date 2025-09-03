import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AuthHandler } from "@/components/AuthHandler";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Lab from "@/pages/lab";
import Sync from "@/pages/sync";
import Reports from "@/pages/reports";
import Dashboard from "@/pages/dashboard";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <>
      <AuthHandler />
      <Switch>
        {/* Landing page always accessible */}
        <Route path="/" component={Landing} />
        
        {/* Protected routes - only accessible when authenticated */}
        {isAuthenticated && (
          <>
            <Route path="/home" component={Home} />
            <Route path="/lab" component={Lab} />
            <Route path="/sync" component={Sync} />
            <Route path="/reports" component={Reports} />
            <Route path="/dashboard" component={Dashboard} />
          </>
        )}
        
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
