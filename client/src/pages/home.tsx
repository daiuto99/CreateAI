import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 gradient-bg rounded-lg animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      
      <main className="lg:ml-64 pb-20 lg:pb-0">
        <Header 
          title="Welcome to CreateAI" 
          subtitle="Your AI-powered content creation workspace"
          action={
            <Link href="/lab" data-testid="link-lab">
              <Button data-testid="button-start-creating">
                <i className="fas fa-flask w-4 h-4 mr-2"></i>
                Start Creating
              </Button>
            </Link>
          }
        />
        
        <div className="p-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <i className="fas fa-project-diagram text-primary"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-projects">0</div>
                <p className="text-xs text-muted-foreground">Get started by creating your first project</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Published Content</CardTitle>
                <i className="fas fa-check-circle text-green-500"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-published-content">0</div>
                <p className="text-xs text-muted-foreground">Publish your first piece of content</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Usage</CardTitle>
                <i className="fas fa-robot text-purple-500"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-ai-usage">0%</div>
                <p className="text-xs text-muted-foreground">of monthly quota used</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Integrations</CardTitle>
                <i className="fas fa-plug text-blue-500"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-integrations">0</div>
                <p className="text-xs text-muted-foreground">integrations connected</p>
              </CardContent>
            </Card>
          </div>

          {/* Getting Started */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-rocket mr-3 text-primary"></i>
                  Quick Start Guide
                </CardTitle>
                <CardDescription>
                  Get up and running with CreateAI in minutes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Create your first project</p>
                      <p className="text-sm text-muted-foreground">Choose between podcast, blog, or e-book</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Generate AI content</p>
                      <p className="text-sm text-muted-foreground">Use our guided workflow to create outlines and drafts</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Setup integrations</p>
                      <p className="text-sm text-muted-foreground">Connect HubSpot, WordPress, and other platforms</p>
                    </div>
                  </div>
                </div>

                <Link href="/lab" data-testid="link-get-started">
                  <Button className="w-full" data-testid="button-get-started">
                    Get Started in The Lab
                    <i className="fas fa-arrow-right ml-2"></i>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-cogs mr-3 text-blue-500"></i>
                  Features Overview
                </CardTitle>
                <CardDescription>
                  Explore what CreateAI can do for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <Link href="/lab" data-testid="link-lab-feature">
                    <div className="p-3 border border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-flask text-primary"></i>
                        <div>
                          <p className="font-medium">The Lab</p>
                          <p className="text-sm text-muted-foreground">AI-powered content creation</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/sync" data-testid="link-sync-feature">
                    <div className="p-3 border border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-sync text-blue-500"></i>
                        <div>
                          <p className="font-medium">CRM Sync</p>
                          <p className="text-sm text-muted-foreground">Meeting intelligence & voice updates</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/reports" data-testid="link-reports-feature">
                    <div className="p-3 border border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-chart-line text-green-500"></i>
                        <div>
                          <p className="font-medium">Reports</p>
                          <p className="text-sm text-muted-foreground">Performance analytics & insights</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/dashboard" data-testid="link-dashboard-feature">
                    <div className="p-3 border border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <i className="fas fa-tachometer-alt text-purple-500"></i>
                        <div>
                          <p className="font-medium">Dashboard</p>
                          <p className="text-sm text-muted-foreground">Real-time KPIs & metrics</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
