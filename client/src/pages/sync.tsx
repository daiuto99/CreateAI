import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserIntegration } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function Sync() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [dismissedMeetings, setDismissedMeetings] = useState(new Set<string>());
  
  // Modal state for Details
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState<any>(null);
  
  // Fetch user integrations to show real connection status
  const { data: integrations = [] } = useQuery<UserIntegration[]>({
    queryKey: ['/api/integrations'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch actual meeting data with loading state
  const { data: meetings = [], isLoading: meetingsLoading, refetch: refetchMeetings } = useQuery<any[]>({
    queryKey: ['/api/meetings'],
    enabled: isAuthenticated,
    retry: false,
    staleTime: 0, // Force fresh data
    gcTime: 0, // Don't cache
  });

  // Fetch Otter.ai transcripts with loading state
  const { data: transcripts = [], isLoading: transcriptsLoading, refetch: refetchTranscripts } = useQuery<any[]>({
    queryKey: ['/api/otter/transcripts'],
    enabled: isAuthenticated,
    retry: false,
    staleTime: 0, // Force fresh data to trigger loading states
    gcTime: 0, // Don't cache for testing
  });

  // Fetch Airtable contacts with loading state  
  const { data: contacts = [], isLoading: contactsLoading, refetch: refetchContacts } = useQuery<any[]>({
    queryKey: ['/api/airtable/contacts'],
    enabled: isAuthenticated,
    retry: false,
    staleTime: 0, // Force fresh data to trigger loading states
    gcTime: 0, // Don't cache for testing
  });

  // Debug loading states
  console.log('🔍 DEBUG Loading States:', {
    transcriptsLoading,
    contactsLoading,
    meetingsLoading,
    isAnalyzingMatches: transcriptsLoading || contactsLoading || meetingsLoading
  });

  // Sync matching analysis loading state
  const isAnalyzingMatches = meetingsLoading || transcriptsLoading || contactsLoading;

  // Mutation for dismissing meetings
  const dismissMeeting = useMutation({
    mutationFn: async (meetingId: string) => {
      const response = await fetch('/api/meetings/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId })
      });
      return response.json();
    },
    onSuccess: (data, meetingId) => {
      setDismissedMeetings(prev => new Set(Array.from(prev).concat(meetingId)));
      toast({
        title: "Meeting Dismissed",
        description: "Meeting has been dismissed and won't appear in sync list.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to dismiss meeting. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for creating Airtable records
  const createAirtableRecord = useMutation({
    mutationFn: async (meeting: any) => {
      const response = await fetch('/api/airtable/create-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "Airtable Record Created",
        description: "Meeting record has been created in Airtable.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create Airtable record. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Enhanced SYNC status query
  const { data: syncStatus = { status: 'unknown', services: {} } } = useQuery({
    queryKey: ['/api/sync/status'],
    enabled: isAuthenticated,
    retry: false,
    staleTime: 30000, // Check every 30 seconds
  });

  // Enhanced mutation for testing new ingest endpoint
  const testIngestMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest('/api/sync/ingest', { data: payload });
    },
    onSuccess: (data) => {
      toast({
        title: "Ingest Test Successful",
        description: `Meeting processed: ${data.result.meetingRecordId}`,
      });
      // Refresh all data after successful ingest
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({
        title: "Ingest Test Failed",
        description: error.message || "Failed to process test meeting",
        variant: "destructive"
      });
    }
  });

  // Enhanced mutation for reprocessing
  const reprocessMutation = useMutation({
    mutationFn: async (transcriptId: string) => {
      return apiRequest(`/api/sync/reprocess/${transcriptId}`, { method: 'POST' });
    },
    onSuccess: (data) => {
      toast({
        title: "Reprocess Successful",
        description: `Transcript ${data.reprocessed} has been reprocessed`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reprocess Failed",
        description: error.message || "Failed to reprocess transcript",
        variant: "destructive"
      });
    }
  });

  // Test payload for enhanced SYNC system
  const testSyncPayload = {
    source: 'otter',
    externalMeetingId: `test-${Date.now()}`,
    title: 'Enhanced SYNC Test Call',
    startISO: new Date().toISOString(),
    attendees: [
      {
        name: 'Alex Johnson',
        email: 'alex.johnson@example.com',
        company: 'TechCorp',
        phone: '+1234567890'
      }
    ],
    transcript: 'This is a test meeting for the enhanced SYNC system with comprehensive logging.',
    notes: 'Testing the new Airtable integration with contact creation and meeting linking.',
    raw: {
      testId: `test-${Date.now()}`,
      source: 'enhanced-sync-test'
    }
  };

  // Mutation for creating contacts from meetings (LEGACY SYNC FEATURE)
  const createContactFromMeeting = useMutation({
    mutationFn: async (meeting: any) => {
      const response = await fetch('/api/sync/create-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          attendees: meeting.attendees
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create contact');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      toast({
        title: "Contact Created!",
        description: data.message || `Contact "${data.contact?.name}" created successfully`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Contact",
        description: error.message || "Could not create contact record",
        variant: "destructive"
      });
    }
  });

  // Mutation for fetching meeting details (NEW SYNC FEATURE)
  const fetchMeetingDetails = useMutation({
    mutationFn: async (meetingId: string) => {
      console.log('Requesting details for meeting:', meetingId);
      const response = await fetch(`/api/sync/meeting-details/${meetingId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch meeting details');
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      setMeetingDetails(data.meeting);
      setSelectedMeeting(data.meeting);
      setIsDetailsModalOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Load Details",
        description: error.message || "Could not fetch meeting details",
        variant: "destructive"
      });
    }
  });
  
  // Helper function to get integration status
  const getIntegrationStatus = (provider: string) => {
    const integration = integrations.find(i => i.provider === provider);
    return integration?.status === 'connected' ? 'Connected' : 'Setup Required';
  };
  
  const getStatusVariant = (provider: string) => {
    const integration = integrations.find(i => i.provider === provider);
    return integration?.status === 'connected' ? 'default' : 'outline';
  };

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
          {/* Enhanced SYNC System Status */}
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-blue-900 flex items-center">
                    <i className="fas fa-sync-alt mr-2"></i>
                    Enhanced SYNC System
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    New Zapier → Airtable integration with comprehensive logging
                  </CardDescription>
                </div>
                <Badge variant={syncStatus.status === 'operational' ? 'default' : 'secondary'}>
                  {syncStatus.status || 'checking...'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Airtable Connection</span>
                  <Badge variant="outline" className="text-xs">
                    {syncStatus.services?.airtable || 'unknown'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Logging Service</span>
                  <Badge variant="outline" className="text-xs">
                    {syncStatus.services?.logger || 'unknown'}
                  </Badge>
                </div>
                
                {/* Test Buttons */}
                <div className="pt-3 border-t flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => testIngestMutation.mutate(testSyncPayload)}
                    disabled={testIngestMutation.isPending}
                    className="flex-1"
                    data-testid="button-test-ingest"
                  >
                    {testIngestMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Testing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-flask mr-2"></i>
                        Test Ingest
                      </>
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => reprocessMutation.mutate('test-transcript-id')}
                    disabled={reprocessMutation.isPending}
                    className="flex-1"
                    data-testid="button-test-reprocess"
                  >
                    {reprocessMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-redo mr-2"></i>
                        Test Reprocess
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meeting History - MOVED TO TOP */}
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
              {meetingsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span>Loading meetings from calendar...</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fetching calendar data may take up to 45 seconds for large calendars
                  </p>
                </div>
              ) : meetings.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fas fa-calendar-check text-4xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No meetings found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {getIntegrationStatus('outlook') === 'Connected' 
                      ? 'Your calendar feed is connected but no recent meetings were found.'
                      : 'Connect your Outlook calendar and Otter.ai account to see meetings here.'
                    }
                  </p>
                  <Button 
                    variant="outline" 
                    data-testid="button-connect-calendar"
                    onClick={() => {
                      setLocation('/integrations');
                    }}
                  >
                    <i className="fas fa-calendar-plus mr-2"></i>
                    Connect Calendar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Sync Matching Analysis Loading State */}
                  {isAnalyzingMatches && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        <div>
                          <p className="font-medium text-blue-900 dark:text-blue-100">Analyzing meeting matches...</p>
                          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            {transcriptsLoading && <p>• Loading transcripts from Otter.AI...</p>}
                            {contactsLoading && <p>• Loading contacts from Airtable...</p>}
                            {meetingsLoading && <p>• Fetching calendar data...</p>}
                            {!isAnalyzingMatches && <p>• Matching attendees to CRM contacts and transcripts with AI confidence scoring</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {meetings
                    .filter((meeting: any) => !dismissedMeetings.has(meeting.id))
                    .map((meeting: any) => (
                    <div key={meeting.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{meeting.title}</h4>
                          <div className="flex items-center space-x-1">
                            {/* Otter.AI Match Icon - BLUE only for real API data, spinner while loading */}
                            {transcriptsLoading ? (
                              <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center" title="Loading transcripts from Otter.AI...">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
                              </div>
                            ) : meeting.hasOtterMatch ? (
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center" 
                                   title={meeting.isOtterFallback ? "High-confidence transcript match found (using enhanced matching)" : "Otter.AI transcript available"}>
                                <i className="fas fa-microphone text-white text-xs"></i>
                              </div>
                            ) : (
                              <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center" 
                                   title="No transcript match found">
                                <i className="fas fa-microphone text-gray-500 text-xs"></i>
                              </div>
                            )}
                            {/* Airtable Match Icon - GREEN only for real API data, spinner while loading */}
                            {contactsLoading ? (
                              <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center" title="Loading contacts from Airtable...">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-green-500"></div>
                              </div>
                            ) : meeting.hasAirtableMatch && !meeting.isAirtableFallback ? (
                              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center" title="Airtable CRM record exists">
                                <i className="fas fa-database text-white text-xs"></i>
                              </div>
                            ) : (
                              <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center" 
                                   title={meeting.isAirtableFallback ? "Using sample data - connect Airtable CRM for real contacts" : "No Airtable CRM record"}>
                                <i className="fas fa-database text-gray-500 text-xs"></i>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(meeting.date).toLocaleDateString()} • {meeting.duration}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {meeting.attendees.join(', ')} • {meeting.status}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => fetchMeetingDetails.mutate(meeting.id)}
                          disabled={fetchMeetingDetails.isPending}
                          data-testid={`button-details-${meeting.id}`}
                        >
                          <i className="fas fa-info-circle mr-1"></i>
                          {fetchMeetingDetails.isPending ? 'Loading...' : 'Details'}
                        </Button>
                        {!meeting.hasAirtableMatch && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => createContactFromMeeting.mutate(meeting)}
                            disabled={createContactFromMeeting.isPending}
                            data-testid={`button-create-contact-${meeting.id}`}
                          >
                            <i className="fas fa-user-plus mr-1"></i>
                            {createContactFromMeeting.isPending ? 'Creating...' : 'Create Record'}
                          </Button>
                        )}
                        {meeting.hasAirtableMatch && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled
                            data-testid={`button-contact-exists-${meeting.id}`}
                          >
                            <i className="fas fa-check mr-1"></i>
                            Contact Exists
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => dismissMeeting.mutate(meeting.id)}
                          disabled={dismissMeeting.isPending}
                        >
                          <i className="fas fa-times mr-1"></i>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Integration Setup - MOVED BELOW MEETINGS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-calendar-alt mr-3 text-blue-500"></i>
                  Meeting Intelligence
                </CardTitle>
                <CardDescription>
                  Automatically sync Outlook calendar and Otter.ai transcripts to Airtable
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
                    <Badge variant={getStatusVariant('outlook')} data-testid="badge-outlook-status">
                      {getIntegrationStatus('outlook')}
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
                    <Badge variant={getStatusVariant('otter')} data-testid="badge-otter-status">
                      {getIntegrationStatus('otter')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-chart-line text-green-500"></i>
                      <div>
                        <p className="font-medium">Airtable CRM</p>
                        <p className="text-sm text-muted-foreground">Contact and deal management</p>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant('airtable')} data-testid="badge-airtable-status">
                      {getIntegrationStatus('airtable')}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium mb-3">How it works:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1">
                    <li>1. Import calendar events from Outlook</li>
                    <li>2. Match meeting attendees to Airtable contacts</li>
                    <li>3. Fetch Otter.ai transcripts and summaries</li>
                    <li>4. Generate AI-powered meeting insights</li>
                    <li>5. One-click sync to Airtable timeline</li>
                  </ol>
                </div>

                <Button 
                  className="w-full" 
                  data-testid="button-setup-meeting-intelligence"
                  onClick={() => {
                    // Check if all integrations are connected
                    const outlookConnected = getIntegrationStatus('outlook') === 'Connected';
                    const otterConnected = getIntegrationStatus('otter') === 'Connected';
                    const freshdeskConnected = getIntegrationStatus('freshdesk') === 'Connected';
                    
                    if (outlookConnected && otterConnected && freshdeskConnected) {
                      toast({
                        title: "Meeting Intelligence Ready!",
                        description: "All integrations connected. Meeting data will be automatically processed.",
                      });
                    } else {
                      toast({
                        title: "Setup Required",
                        description: "Please connect all integrations first: Outlook, Otter.ai, and Freshdesk CRM.",
                        variant: "destructive",
                      });
                      setLocation('/integrations');
                    }
                  }}
                >
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


          {/* Sync Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meetings Synced</CardTitle>
                <i className="fas fa-calendar-check text-green-500"></i>
              </CardHeader>
              <CardContent>
                {meetingsLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-meetings-synced">{meetings.filter((m: any) => !dismissedMeetings.has(m.id)).length}</div>
                )}
                <p className="text-xs text-muted-foreground">this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Voice Updates</CardTitle>
                <i className="fas fa-microphone text-purple-500"></i>
              </CardHeader>
              <CardContent>
                {transcriptsLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-voice-updates">{transcripts.length}</div>
                )}
                <p className="text-xs text-muted-foreground">processed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CRM Actions</CardTitle>
                <i className="fas fa-tasks text-blue-500"></i>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-crm-actions">0</div>
                )}
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

          {/* Meeting Details Modal */}
          <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <i className="fas fa-info-circle text-blue-500"></i>
                  <span>Meeting Details</span>
                </DialogTitle>
                <DialogDescription>
                  Complete information and attendee details for this meeting
                </DialogDescription>
              </DialogHeader>
              
              {meetingDetails && (
                <div className="space-y-6">
                  {/* Basic Meeting Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Meeting Title</h4>
                      <p className="font-medium">{meetingDetails.title}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Type</h4>
                      <Badge variant="outline">{meetingDetails.meetingType}</Badge>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Date & Time</h4>
                      <p>{meetingDetails.date ? new Date(meetingDetails.date.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).toLocaleString() : 'Unknown'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Duration</h4>
                      <p>{meetingDetails.duration}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Location</h4>
                      <p>{meetingDetails.location}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">Attendees</h4>
                      <p>{meetingDetails.attendeeCount} people</p>
                    </div>
                  </div>

                  {/* Contact Name Suggestion */}
                  <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-2">
                      <i className="fas fa-lightbulb mr-2"></i>
                      Suggested Contact Name
                    </h4>
                    <p className="text-blue-700 dark:text-blue-300 font-medium">
                      {meetingDetails.suggestedContactName}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Extracted from meeting title using intelligent parsing
                    </p>
                  </div>

                  {/* Description */}
                  {meetingDetails.description && meetingDetails.description !== 'No description available' && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Description</h4>
                      <p className="text-sm bg-muted/20 p-3 rounded-lg">{meetingDetails.description}</p>
                    </div>
                  )}

                  {/* Attendees List */}
                  {meetingDetails.attendees && meetingDetails.attendees.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-3">
                        Attendees ({meetingDetails.attendees.length})
                      </h4>
                      <div className="space-y-2">
                        {meetingDetails.attendees.map((attendee: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                <i className="fas fa-user text-xs text-muted-foreground"></i>
                              </div>
                              <div>
                                <p className="font-medium text-sm">{attendee.name}</p>
                                <p className="text-xs text-muted-foreground">{attendee.email}</p>
                              </div>
                            </div>
                            <Badge variant={attendee.role === 'Required' ? 'default' : 'outline'} className="text-xs">
                              {attendee.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons in Modal */}
                  <div className="flex space-x-2 pt-4 border-t">
                    {!meetingDetails.hasAirtableMatch && (
                      <Button 
                        onClick={() => {
                          setIsDetailsModalOpen(false);
                          createContactFromMeeting.mutate({
                            id: meetingDetails.id,
                            title: meetingDetails.title,
                            attendees: meetingDetails.attendees?.map((a: any) => a.email) || []
                          });
                        }}
                        disabled={createContactFromMeeting.isPending}
                        className="flex-1"
                      >
                        <i className="fas fa-user-plus mr-2"></i>
                        {createContactFromMeeting.isPending ? 'Creating Contact...' : 'Create Contact Record'}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDetailsModalOpen(false)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
