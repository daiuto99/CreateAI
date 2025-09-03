import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reports() {
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
          title="Reports" 
          subtitle="Performance analytics and custom reporting"
          action={
            <Button data-testid="button-create-report">
              <i className="fas fa-plus w-4 h-4 mr-2"></i>
              Create Report
            </Button>
          }
        />
        
        <div className="p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
              <TabsTrigger value="social" data-testid="tab-social">Social</TabsTrigger>
              <TabsTrigger value="custom" data-testid="tab-custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
                    <i className="fas fa-eye text-blue-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-reach">0</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-500">+0%</span> from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                    <i className="fas fa-heart text-red-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-engagement-rate">0%</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-500">+0%</span> from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Content Pieces</CardTitle>
                    <i className="fas fa-file-alt text-green-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-content-pieces">0</div>
                    <p className="text-xs text-muted-foreground">published this month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    <i className="fas fa-chart-line text-purple-500"></i>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-conversion-rate">0%</div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-500">+0%</span> from last month
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Placeholder */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Trends</CardTitle>
                    <CardDescription>Content performance over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
                      <div className="text-center">
                        <i className="fas fa-chart-line text-4xl text-muted-foreground mb-4"></i>
                        <p className="text-muted-foreground">Analytics chart will appear here</p>
                        <p className="text-sm text-muted-foreground mt-2">Connect integrations to see data</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Content</CardTitle>
                    <CardDescription>Best content by engagement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center py-12">
                        <i className="fas fa-trophy text-4xl text-muted-foreground mb-4"></i>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No data yet</h3>
                        <p className="text-muted-foreground">Create and publish content to see top performers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Content Performance</CardTitle>
                  <CardDescription>Detailed analytics for your content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <i className="fas fa-file-alt text-4xl text-muted-foreground mb-4"></i>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No content analytics yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Publish your first piece of content to start tracking performance metrics
                    </p>
                    <Button variant="outline" data-testid="button-create-content">
                      <i className="fas fa-plus mr-2"></i>
                      Create Content
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Social Media Analytics</CardTitle>
                  <CardDescription>Performance across social platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <i className="fas fa-share-alt text-4xl text-muted-foreground mb-4"></i>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Social analytics coming soon</h3>
                    <p className="text-muted-foreground mb-4">
                      Connect your social media accounts to track engagement and reach
                    </p>
                    <Button variant="outline" data-testid="button-connect-social">
                      <i className="fas fa-link mr-2"></i>
                      Connect Social Accounts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Report Builder</CardTitle>
                    <CardDescription>Create tailored reports for your needs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Report Name</label>
                        <input 
                          type="text" 
                          placeholder="Monthly Performance Report"
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                          data-testid="input-report-name"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Date Range</label>
                        <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" data-testid="select-date-range">
                          <option value="last-30-days">Last 30 Days</option>
                          <option value="last-quarter">Last Quarter</option>
                          <option value="last-year">Last Year</option>
                          <option value="custom">Custom Range</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Sections</label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded border-border" data-testid="checkbox-content-performance" />
                            <span className="text-sm">Content Performance</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded border-border" data-testid="checkbox-social-media" />
                            <span className="text-sm">Social Media</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded border-border" data-testid="checkbox-website-traffic" />
                            <span className="text-sm">Website Traffic</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded border-border" data-testid="checkbox-conversion-metrics" />
                            <span className="text-sm">Conversion Metrics</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Output Format</label>
                        <select className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground" data-testid="select-output-format">
                          <option value="pdf">PDF</option>
                          <option value="email">Email Report</option>
                          <option value="dashboard">Dashboard View</option>
                        </select>
                      </div>

                      <Button className="w-full" data-testid="button-generate-report">
                        <i className="fas fa-magic mr-2"></i>
                        Generate Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled Reports</CardTitle>
                    <CardDescription>Automated report delivery</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <i className="fas fa-calendar-alt text-3xl text-muted-foreground mb-3"></i>
                      <h4 className="font-medium mb-2">No scheduled reports</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Set up automated reports to receive regular insights
                      </p>
                      <Button variant="outline" size="sm" data-testid="button-schedule-report">
                        <i className="fas fa-plus mr-2"></i>
                        Schedule Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
