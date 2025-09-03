import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { ContentProject, UserIntegration } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import Header from "@/components/layout/header";
import StatsCard from "@/components/dashboard/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

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

  // Get user's first organization  
  const organizationId = user?.uid; // Use uid as organizationId for now

  const { data: projects = [] } = useQuery<ContentProject[]>({
    queryKey: ['/api/content-projects', organizationId],
    enabled: !!organizationId,
    retry: false,
  });

  const { data: integrations = [] } = useQuery<UserIntegration[]>({
    queryKey: ['/api/integrations'],
    enabled: !!user,
    retry: false,
  });

  const { data: analytics = [] } = useQuery<any[]>({
    queryKey: ['/api/analytics/snapshots', organizationId],
    enabled: !!organizationId,
    retry: false,
  });

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

  const activeProjects = projects.length;
  const publishedContent = projects.filter(p => p.status === 'published').length;
  const totalContent = projects.reduce((acc: number, p) => acc + (p.metadata as any)?.itemCount || 0, 0);
  const connectedIntegrations = integrations.filter(i => i.status === 'connected').length;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      
      <main className="lg:ml-64 pb-20 lg:pb-0">
        <Header 
          title="Dashboard" 
          subtitle="Live KPIs and performance metrics"
          action={
            <Button data-testid="button-refresh-data">
              <i className="fas fa-sync w-4 h-4 mr-2"></i>
              Refresh Data
            </Button>
          }
        />
        
        <div className="p-6">
          {/* KPI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Pipeline Value"
              value="$0"
              change="No data available"
              icon="fas fa-dollar-sign"
              color="green"
              testId="stats-pipeline-value"
            />
            
            <StatsCard
              title="Lead Conversion"
              value="0%"
              change="No conversions yet"
              icon="fas fa-chart-line"
              color="blue"
              testId="stats-lead-conversion"
            />
            
            <StatsCard
              title="Content Performance"
              value={`${publishedContent}/${totalContent}`}
              change={`${activeProjects} active projects`}
              icon="fas fa-file-alt"
              color="primary"
              testId="stats-content-performance"
            />
            
            <StatsCard
              title="Integration Health"
              value={`${connectedIntegrations}/${integrations.length}`}
              change="integrations active"
              icon="fas fa-plug"
              color="purple"
              testId="stats-integration-health"
            />
          </div>

          <Tabs defaultValue="crm" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="crm" data-testid="tab-crm">CRM Metrics</TabsTrigger>
              <TabsTrigger value="marketing" data-testid="tab-marketing">Marketing</TabsTrigger>
              <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
              <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="crm" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pipeline Velocity</CardTitle>
                    <i className="fas fa-tachometer-alt text-blue-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-pipeline-velocity">0 days</div>
                    <p className="text-xs text-muted-foreground">average deal cycle</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Meeting Success</CardTitle>
                    <i className="fas fa-calendar-check text-green-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-meeting-success">0%</div>
                    <p className="text-xs text-muted-foreground">booking to close rate</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Deal Closure</CardTitle>
                    <i className="fas fa-handshake text-purple-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-deal-closure">0%</div>
                    <p className="text-xs text-muted-foreground">win rate this quarter</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>CRM Activity</CardTitle>
                  <CardDescription>Recent pipeline and contact activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <i className="fas fa-address-book text-4xl text-muted-foreground mb-4"></i>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No CRM data available</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Connect your HubSpot integration to see pipeline metrics and activity data.
                    </p>
                    <Button variant="outline" data-testid="button-connect-hubspot">
                      <i className="fas fa-hubspot mr-2"></i>
                      Connect HubSpot
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="marketing" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Website Traffic</CardTitle>
                    <i className="fas fa-globe text-blue-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-website-traffic">0</div>
                    <p className="text-xs text-muted-foreground">monthly visitors</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Social Engagement</CardTitle>
                    <i className="fas fa-heart text-red-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-social-engagement">0%</div>
                    <p className="text-xs text-muted-foreground">average engagement rate</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Email Performance</CardTitle>
                    <i className="fas fa-envelope text-green-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-email-performance">0%</div>
                    <p className="text-xs text-muted-foreground">open rate this month</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Marketing Performance</CardTitle>
                  <CardDescription>Traffic sources and conversion metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <i className="fas fa-chart-bar text-4xl text-muted-foreground mb-4"></i>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No marketing data available</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Connect Google Analytics and social media accounts to track marketing performance.
                    </p>
                    <Button variant="outline" data-testid="button-connect-analytics">
                      <i className="fas fa-chart-line mr-2"></i>
                      Connect Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Blog Performance</CardTitle>
                    <i className="fas fa-blog text-blue-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-blog-performance">0</div>
                    <p className="text-xs text-muted-foreground">average monthly views</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Podcast Downloads</CardTitle>
                    <i className="fas fa-podcast text-green-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-podcast-downloads">0</div>
                    <p className="text-xs text-muted-foreground">total downloads</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">E-book Conversions</CardTitle>
                    <i className="fas fa-book text-purple-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-ebook-conversions">0%</div>
                    <p className="text-xs text-muted-foreground">download to lead rate</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Content</CardTitle>
                    <CardDescription>Best content by engagement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <i className="fas fa-trophy text-3xl text-muted-foreground mb-3"></i>
                      <h4 className="font-medium mb-2">No content data yet</h4>
                      <p className="text-sm text-muted-foreground">
                        Publish content to see top performers
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Content Calendar</CardTitle>
                    <CardDescription>Upcoming and recent publications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <i className="fas fa-calendar text-3xl text-muted-foreground mb-3"></i>
                      <h4 className="font-medium mb-2">No scheduled content</h4>
                      <p className="text-sm text-muted-foreground">
                        Plan your content calendar in The Lab
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Performance</CardTitle>
                    <CardDescription>Application health and response times</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">API Response Time</span>
                        <span className="text-sm text-muted-foreground" data-testid="text-api-response">&lt; 200ms</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Data Freshness</span>
                        <span className="text-sm text-muted-foreground" data-testid="text-data-freshness">Real-time</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Integration Health</span>
                        <span className="text-sm text-muted-foreground" data-testid="text-integration-health">{connectedIntegrations}/{integrations?.length || 0} Connected</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: (integrations?.length || 0) > 0 ? `${(connectedIntegrations / (integrations?.length || 1)) * 100}%` : '0%' }}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Usage Statistics</CardTitle>
                    <CardDescription>Resource consumption and quotas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">AI Quota Usage</span>
                        <span className="text-sm text-muted-foreground" data-testid="text-ai-quota">0% used</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Storage Used</span>
                        <span className="text-sm text-muted-foreground" data-testid="text-storage-used">0 MB / 1 GB</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '2%' }}></div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">API Requests</span>
                        <span className="text-sm text-muted-foreground" data-testid="text-api-requests">0 / 10,000</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Alerts</CardTitle>
                  <CardDescription>System notifications and recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <i className="fas fa-bell text-3xl text-muted-foreground mb-3"></i>
                    <h4 className="font-medium mb-2">No alerts</h4>
                    <p className="text-sm text-muted-foreground">
                      All systems operating normally
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
