import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AuthHandler } from "@/components/AuthHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "@/lib/debugHelpers"; // Load debug tools
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Lab from "@/pages/lab";
import Sync from "@/pages/sync";
import Reports from "@/pages/reports";
import Dashboard from "@/pages/dashboard";
import Integrations from "@/pages/integrations";
import ProjectDetail from "@/pages/project-detail";

function MainContent() {
  const { status } = useAuth();
  
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Always show landing page regardless of auth state
  return <Landing />;
}

function Router() {
  const { firebaseUser, status } = useAuth();

  return (
    <>
      <AuthHandler />
      <Switch>
        <Route path="/" component={MainContent} />
        
        {/* Protected routes - only accessible when authenticated */}
        {firebaseUser && (
          <>
            <Route path="/home" component={Home} />
            <Route path="/lab" component={Lab} />
            <Route path="/project/:id" component={ProjectDetail} />
            <Route path="/sync" component={Sync} />
            <Route path="/reports" component={Reports} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/integrations" component={Integrations} />
          </>
        )}
        
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  // console.log('🚀 App component mounting/re-rendering at:', new Date().toISOString());
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
