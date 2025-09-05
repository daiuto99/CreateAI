import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Sync() {
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
        window.location.href = "/";
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
          title="Sync" 
          subtitle="AI-assisted integration and meeting intelligence"
        />
        
        <div className="p-6">
          {/* Integration Setup */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-calendar-alt mr-3 text-blue-500"></i>
                  Meeting Intelligence
                </CardTitle>
                <CardDescription>
                  Automatically sync Outlook calendar and Otter.ai transcripts to Bigin by Zoho
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-calendar text-blue-500"></i>
                      <div>
                        <p className="font-medium">Outlook Calendar</p>
                        <p className="text-sm text-muted-foreground">Connect to sync meeting data</p>
                      </div>
                    </div>
                    <Badge variant="outline" data-testid="badge-outlook-status">
                      Setup Required
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-microphone text-green-500"></i>
                      <div>
                        <p className="font-medium">Otter.ai</p>
                        <p className="text-sm text-muted-foreground">Meeting transcription service</p>
                      </div>
                    </div>
                    <Badge variant="outline" data-testid="badge-otter-status">
                      Setup Required
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-chart-line text-green-500"></i>
                      <div>
                        <p className="font-medium">Bigin by Zoho CRM</p>
                        <p className="text-sm text-muted-foreground">Contact and deal management</p>
                      </div>
                    </div>
                    <Badge variant="outline" data-testid="badge-bigin-status">
                      Setup Required
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium mb-3">How it works:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Import calendar events from Outlook</li>
                    <li>2. Match meeting attendees to Bigin contacts</li>
                    <li>3. Fetch Otter.ai transcripts and summaries</li>
                    <li>4. Generate AI-powered meeting insights</li>
                    <li>5. One-click sync to Bigin timeline</li>
                  </ol>
                </div>

                <Button className="w-full" data-testid="button-setup-meeting-intelligence">
                  <i className="fas fa-rocket mr-2"></i>
                  Setup Meeting Intelligence
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-microphone-alt mr-3 text-purple-500"></i>
                  Voice Capture
                </CardTitle>
                <CardDescription>
                  Convert voice updates into CRM actions with AI assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Supported Actions:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Add notes to contacts/companies/deals</li>
                      <li>• Create follow-up tasks with due dates</li>
                      <li>• Update deal stages and amounts</li>
                      <li>• Schedule next meetings</li>
                      <li>• Create new contacts with basic info</li>
                    </ul>
                  </div>

                  <div className="p-4 border border-dashed border-border rounded-lg text-center">
                    <i className="fas fa-microphone text-4xl text-muted-foreground mb-3"></i>
                    <p className="font-medium mb-1">Ready to capture</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click to start recording your voice update
                    </p>
                    <Button data-testid="button-start-voice-capture">
                      <i className="fas fa-microphone mr-2"></i>
                      Start Voice Capture
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium mb-2">Recent Voice Updates</h4>
                  <div className="text-center py-8">
                    <i className="fas fa-inbox text-2xl text-muted-foreground mb-2"></i>
                    <p className="text-sm text-muted-foreground">No voice updates yet</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Meeting History */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-history mr-3 text-green-500"></i>
                Meeting History
              </CardTitle>
              <CardDescription>
                Recent meetings captured and processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <i className="fas fa-calendar-check text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-semibold text-foreground mb-2">No meetings captured yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Once you connect your Outlook calendar and Otter.ai account, meetings will appear here for review and sync to Bigin by Zoho.
                </p>
                <Button variant="outline" data-testid="button-connect-calendar">
                  <i className="fas fa-calendar-plus mr-2"></i>
                  Connect Calendar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sync Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meetings Synced</CardTitle>
                <i className="fas fa-calendar-check text-green-500"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-meetings-synced">0</div>
                <p className="text-xs text-muted-foreground">this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Voice Updates</CardTitle>
                <i className="fas fa-microphone text-purple-500"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-voice-updates">0</div>
                <p className="text-xs text-muted-foreground">processed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CRM Actions</CardTitle>
                <i className="fas fa-tasks text-blue-500"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-crm-actions">0</div>
                <p className="text-xs text-muted-foreground">automated</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
                <i className="fas fa-clock text-orange-500"></i>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-time-saved">0h</div>
                <p className="text-xs text-muted-foreground">this month</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
