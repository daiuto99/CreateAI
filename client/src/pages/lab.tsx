import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBackendUser } from "@/hooks/useBackendUser";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { ContentProject, UserIntegration } from "@shared/schema";
import { isUnauthorizedError, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import Header from "@/components/layout/header";
import ContentCard from "@/components/content/content-card";
import WorkflowSteps from "@/components/content/workflow-steps";
import IntegrationStatus from "@/components/integrations/integration-status";
import StatsCard from "@/components/dashboard/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  type: z.enum(['podcast', 'blog', 'ebook']),
  hostType: z.enum(['single', 'morning_show', 'interview']).optional(),
  description: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function Lab() {
  // ✅ All hooks declared at top level - no conditional hooks
  const { toast } = useToast();
  const { firebaseUser, status } = useAuth();
  const { data: backendUser, isLoading: isFetchingBackendUser } = useBackendUser(firebaseUser);
  const queryClient = useQueryClient();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [, setLocation] = useLocation();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      type: 'podcast',
      hostType: 'single',
      description: '',
    }
  });

  // Get user's first organization from backend data
  const organizationId = backendUser?.organizations?.[0]?.id;

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ContentProject[]>({
    queryKey: ['/api/content-projects', organizationId],
    queryFn: async () => {
      console.log('📋 Fetching projects for organization:', organizationId);
      if (!organizationId) {
        console.warn('📋 No organizationId available for project fetch');
        return [];
      }
      
      const response = await fetch(`/api/content-projects?organizationId=${organizationId}`, {
        credentials: 'include'
      });
      
      console.log('📋 Projects fetch response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        organizationId
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('📋 Failed to fetch projects:', errorText);
        throw new Error(`Failed to fetch projects: ${response.status} ${errorText}`);
      }
      
      const projectsData = await response.json();
      console.log('📋 Fetched projects:', {
        count: projectsData.length,
        projects: projectsData.map((p: any) => ({ id: p.id, name: p.name, type: p.type }))
      });
      
      return projectsData;
    },
    enabled: !!organizationId,
    retry: false,
  });

  const { data: integrations = [] } = useQuery<UserIntegration[]>({
    queryKey: ['/api/integrations'],
    enabled: !!firebaseUser,
    retry: false,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      console.log('📁 Creating project - Debug info:', {
        organizationId,
        backendUserOrgs: backendUser?.organizations,
        formData: data,
        firebaseUser: {
          uid: firebaseUser?.uid,
          email: firebaseUser?.email
        },
        timestamp: new Date().toISOString()
      });
      
      if (!organizationId) {
        console.error('🚨 Project creation failed: No organization found');
        console.error('Debug - backendUser:', backendUser);
        console.error('Debug - organizations:', backendUser?.organizations);
        
        // Store error debug info
        try {
          sessionStorage.setItem('debug-project-creation-error', JSON.stringify({
            timestamp: new Date().toISOString(),
            error: 'No organization found',
            backendUser,
            firebaseUser: {
              uid: firebaseUser?.uid,
              email: firebaseUser?.email
            }
          }));
        } catch (e) {
          console.warn('Failed to store project creation debug info:', e);
        }
        
        throw new Error('No organization found. Please contact support.');
      }
      
      const requestData = {
        ...data,
        organizationId,
        settings: data.type === 'podcast' ? { hostType: data.hostType } : {}
      };
      
      console.log('📁 Sending project creation request:', requestData);
      
      const response = await apiRequest('POST', '/api/content-projects', requestData);
      
      console.log('📁 Project creation response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      
      const result = await response.json();
      console.log('📁 Project creation result:', result);
      
      return result;
    },
    onSuccess: () => {
      console.log('🔄 Project created successfully, invalidating queries');
      
      // Invalidate the specific organization's projects
      queryClient.invalidateQueries({ 
        queryKey: ['/api/content-projects', organizationId] 
      });
      
      // Also invalidate any general project queries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/content-projects'] 
      });
      
      setNewProjectOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: (error: any) => {
      console.error('📍 Project creation failed:', {
        error: error?.message || error,
        stack: error?.stack,
        organizationId,
        backendUser,
        timestamp: new Date().toISOString()
      });
      
      // Store detailed error info for debugging
      try {
        sessionStorage.setItem('debug-project-creation-error', JSON.stringify({
          timestamp: new Date().toISOString(),
          error: error?.message || error?.toString() || 'Unknown error',
          stack: error?.stack,
          organizationId,
          backendUser,
          firebaseUser: {
            uid: firebaseUser?.uid,
            email: firebaseUser?.email
          }
        }));
        console.log('📍 Project creation error debug info saved to sessionStorage');
      } catch (e) {
        console.warn('Failed to store project creation error debug info:', e);
      }
      
      if (isUnauthorizedError(error)) {
        console.log('📍 Unauthorized error detected, redirecting to login');
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
      
      const errorMessage = error?.message || 'Failed to create project';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  // ✅ hooks above; rendering logic below

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to continue.</p>
          <button onClick={() => window.location.href = "/api/login"} className="bg-blue-600 text-white px-4 py-2 rounded">Sign In</button>
        </div>
      </div>
    );
  }

  if (isFetchingBackendUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'podcast':
        return '🎙️';
      case 'blog':
        return '📝';
      case 'ebook':
        return '📚';
      default:
        return '📄';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <MobileNav />
          <Header title="The Lab" />
          
          <main className="flex-1 overflow-auto">
            <div className="p-6 space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">The Lab</h1>
                  <p className="text-muted-foreground">Create amazing content with AI assistance</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Signed in as: {firebaseUser.email}
                  {organizationId && <div>Active org: {organizationId}</div>}
                </div>
              </div>

              {/* Recent Projects */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Recent Projects</h2>
                  <select className="text-sm border rounded px-3 py-1" data-testid="select-project-status">
                    <option>All Status</option>
                    <option>Draft</option>
                    <option>Published</option>
                  </select>
                </div>

                {projectsLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg animate-pulse mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading projects...</p>
                  </div>
                ) : projects.length > 0 ? (
                  <div className="grid gap-6">
                    {projects.map((project) => (
                      <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => {
                              console.log('🔗 Navigating to project:', project.id);
                              setLocation(`/project/${project.id}`);
                            }}>
                        <CardHeader>
                          <CardTitle className="flex items-center hover:text-primary transition-colors">
                            <span className="mr-2">{getProjectIcon(project.type)}</span>
                            {project.name}
                          </CardTitle>
                          <CardDescription>
                            {project.type} • Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Status: {project.status}</span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                console.log('🔗 View Project button clicked for:', project.id);
                                setLocation(`/project/${project.id}`);
                              }}
                              data-testid={`button-view-project-${project.id}`}
                            >
                              View Project
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="text-4xl mb-4">🎯</div>
                      <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                      <p className="text-muted-foreground mb-4 text-center">
                        Create your first project to get started with AI-powered content creation
                      </p>
                      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                        <DialogTrigger asChild>
                          <Button data-testid="button-create-first-project">
                            Create Your First Project
                          </Button>
                        </DialogTrigger>
                        <DialogContent data-testid="dialog-create-project">
                          <DialogHeader>
                            <DialogTitle>Create New Project</DialogTitle>
                            <DialogDescription>
                              Start a new content creation project
                            </DialogDescription>
                          </DialogHeader>
                          
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Project Name</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="My Awesome Project"
                                        data-testid="input-project-name"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Content Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-project-type">
                                          <SelectValue placeholder="Select content type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="podcast">Podcast</SelectItem>
                                        <SelectItem value="blog">Blog</SelectItem>
                                        <SelectItem value="ebook">E-Book</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {form.watch('type') === 'podcast' && (
                                <FormField
                                  control={form.control}
                                  name="hostType"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Host Type</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger data-testid="select-host-type">
                                            <SelectValue placeholder="Select host type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="single">Single Host</SelectItem>
                                          <SelectItem value="morning_show">Morning Show</SelectItem>
                                          <SelectItem value="interview">Interview</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}

                              <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        placeholder="Brief description of your project..."
                                        data-testid="textarea-project-description"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="flex justify-end space-x-2">
                                <Button type="button" variant="outline" onClick={() => setNewProjectOpen(false)} data-testid="button-cancel">
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={createProjectMutation.isPending} data-testid="button-create">
                                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* AI Workflow Assistant */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">AI Workflow Assistant</h2>
                <WorkflowSteps />
              </div>

              {/* Integration Status */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">Integration Status</h2>
                <IntegrationStatus integrations={integrations as any} />
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Active Projects"
                  value="0"
                  change="this week"
                  icon="fas fa-project-diagram"
                  color="blue"
                />
                <StatsCard
                  title="Published"
                  value="0"
                  change="this month"
                  icon="fas fa-check-circle"
                  color="green"
                />
                <StatsCard
                  title="Total Content"
                  value="0"
                  change="all time"
                  icon="fas fa-file-alt"
                  color="purple"
                />
                <StatsCard
                  title="AI Usage"
                  value="0%"
                  change="of monthly quota"
                  icon="fas fa-robot"
                  color="orange"
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}