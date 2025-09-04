import { useEffect, useState } from "react";
import { useAuth, type User } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const { toast } = useToast();
  const { user: authUser, isAuthenticated, isLoading } = useAuth();
  const user = authUser;
  const queryClient = useQueryClient();
  // Removed activeTab since we no longer have content type tabs
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      type: 'podcast',
      hostType: 'single',
      description: '',
    }
  });

  // Get user's first organization
  const organizationId = user?.organizations?.[0]?.id;

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

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ContentProject[]>({
    queryKey: ['/api/content-projects', organizationId],
    enabled: !!organizationId,
    retry: false,
  });

  const { data: integrations = [] } = useQuery<UserIntegration[]>({
    queryKey: ['/api/integrations'],
    enabled: !!user,
    retry: false,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      if (!organizationId) {
        throw new Error('No organization found. Please contact support.');
      }
      const response = await apiRequest('POST', '/api/content-projects', {
        ...data,
        organizationId,
        settings: data.type === 'podcast' ? { hostType: data.hostType } : {}
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-projects'] });
      setNewProjectOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };


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


  const filteredProjects = projects || [];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      
      <main className="lg:ml-64 pb-20 lg:pb-0">
        <Header 
          title="The Lab" 
          subtitle="Create amazing content with AI assistance"
        />
        
        <div className="p-6">
          {/* Content Type Tabs Removed - Now using unified project creation */}

          {/* Content Projects */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Recent Projects</h2>
              <div className="flex items-center space-x-2">
                <select className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground" data-testid="select-filter-status">
                  <option value="">All Status</option>
                  <option value="outline">Outline</option>
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            {projectsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="content-card rounded-lg p-6 animate-pulse">
                    <div className="h-4 bg-muted rounded mb-3"></div>
                    <div className="h-3 bg-muted rounded mb-4 w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project: any) => (
                  <ContentCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <i className="fas fa-flask text-4xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first project to get started with AI-powered content creation
                  </p>
                  <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-first-project">
                        <i className="fas fa-plus mr-2"></i>
                        Create Your First Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md" data-testid="dialog-create-project">
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
                                    <SelectItem value="podcast" data-testid="option-podcast">
                                      <div className="flex items-center">
                                        <i className="fas fa-microphone w-4 h-4 mr-2"></i>
                                        Podcast
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="blog" data-testid="option-blog">
                                      <div className="flex items-center">
                                        <i className="fas fa-blog w-4 h-4 mr-2"></i>
                                        Blog
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="ebook" data-testid="option-ebook">
                                      <div className="flex items-center">
                                        <i className="fas fa-book w-4 h-4 mr-2"></i>
                                        E-Book
                                      </div>
                                    </SelectItem>
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
                                      <SelectItem value="single" data-testid="option-single-host">Single Host</SelectItem>
                                      <SelectItem value="morning_show" data-testid="option-morning-show">Morning Show</SelectItem>
                                      <SelectItem value="interview" data-testid="option-interview">Interview</SelectItem>
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
                                    data-testid="input-project-description"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setNewProjectOpen(false)}
                              data-testid="button-cancel-project"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createProjectMutation.isPending}
                              data-testid="button-submit-project"
                            >
                              {createProjectMutation.isPending ? (
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                              ) : (
                                <i className="fas fa-plus mr-2"></i>
                              )}
                              Create Project
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

          {/* Workflow Section */}
          <WorkflowSteps />

          {/* Integration Status */}
          <div className="mb-8">
            <IntegrationStatus integrations={integrations} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard
              title="Active Projects"
              value={projects?.length || 0}
              change="+0 this week"
              icon="fas fa-project-diagram"
              color="primary"
            />
            
            <StatsCard
              title="Published"
              value={projects?.filter(p => p.status === 'published').length || 0}
              change="+0 this month"
              icon="fas fa-check-circle"
              color="green"
            />
            
            <StatsCard
              title="Total Content"
              value={projects?.reduce((acc: number, p) => acc + ((p.metadata as any)?.itemCount || 0), 0) || 0}
              change="+0% growth"
              icon="fas fa-file-alt"
              color="blue"
            />
            
            <StatsCard
              title="AI Usage"
              value="0%"
              change="of monthly quota"
              icon="fas fa-robot"
              color="purple"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
