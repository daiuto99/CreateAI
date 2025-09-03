import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContentProject } from "@shared/schema";
import { isUnauthorizedError, apiRequest } from "@/lib/queryClient";
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
import { Plus, Mic, FileText, Book, TrendingUp, Calendar } from "lucide-react";

// Import CreateAI logo
import createAILogo from '@assets/generated_images/createai_logo.png'

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  type: z.enum(['podcast', 'blog', 'ebook']),
  hostType: z.enum(['single', 'morning_show', 'interview']).optional(),
  description: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function Home() {
  const { toast } = useToast();
  const { user: authUser, isAuthenticated, isLoading } = useAuth();
  const user = authUser as User;
  const queryClient = useQueryClient();
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
  const organizationId = user?.organizations?.[0]?.organization?.id;

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

  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'podcast': return <Mic className="w-5 h-5" />;
      case 'blog': return <FileText className="w-5 h-5" />;
      case 'ebook': return <Book className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'podcast': return 'Podcast';
      case 'blog': return 'Blog';
      case 'ebook': return 'E-Book';
      default: return type;
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg animate-pulse mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header with Logo and Create Button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <img 
              src={createAILogo} 
              alt="CreateAI" 
              className="w-48 h-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Welcome back!</h1>
              <p className="text-muted-foreground">Create amazing content with AI assistance</p>
            </div>
          </div>
          
          {/* Prominent Create New Project Button */}
          <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg" data-testid="button-create-project">
                <Plus className="w-6 h-6 mr-3" />
                Create New Project
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
                                <Mic className="w-4 h-4 mr-2" />
                                Podcast
                              </div>
                            </SelectItem>
                            <SelectItem value="blog" data-testid="option-blog">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 mr-2" />
                                Blog
                              </div>
                            </SelectItem>
                            <SelectItem value="ebook" data-testid="option-ebook">
                              <div className="flex items-center">
                                <Book className="w-4 h-4 mr-2" />
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
                      {createProjectMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Project
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Recent Projects */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Projects</h2>
          
          {projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-full mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.slice(0, 6).map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer" data-testid={`project-card-${project.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-lg">
                        {getProjectIcon(project.type)}
                        <span className="ml-2">{project.name}</span>
                      </CardTitle>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {getProjectTypeLabel(project.type)}
                      </span>
                    </div>
                    <CardDescription className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-1" />
                      {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground capitalize">
                        Status: {project.status}
                      </span>
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-muted-foreground mb-4">
                  <FileText className="w-12 h-12" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4 text-center">
                  Create your first project to get started with AI-powered content creation
                </p>
                <Button onClick={() => setNewProjectOpen(true)} data-testid="button-create-first-project">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/lab'}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                  <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                The Lab
              </CardTitle>
              <CardDescription>
                AI-powered content creation workspace
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/sync'}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mr-3">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                Sync
              </CardTitle>
              <CardDescription>
                Sync with Bigin by Zoho CRM
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/dashboard'}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                Dashboard
              </CardTitle>
              <CardDescription>
                Performance analytics and insights
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}