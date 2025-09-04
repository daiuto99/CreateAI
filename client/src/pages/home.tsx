import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContentProject } from "@shared/schema";
import { isUnauthorizedError, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, FileText, Book, TrendingUp, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Import CreateAI logo
import createAILogo from '@assets/generated_images/createai_logo.png'

export default function Home() {
  const { toast } = useToast();
  const { user: authUser, isAuthenticated, isLoading } = useAuth();
  const user = authUser;
  const queryClient = useQueryClient();

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

  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'podcast':
        return <Mic className="w-5 h-5 text-blue-600" />;
      case 'blog':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'ebook':
        return <Book className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
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
        {/* Header with Logo */}
        <div className="flex items-center mb-8">
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
                <Button onClick={() => window.location.href = '/lab'} data-testid="button-create-first-project">
                  <FileText className="w-4 h-4 mr-2" />
                  Go to The Lab
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
                <Mic className="w-6 h-6 text-blue-600 mr-3" />
                The Lab
              </CardTitle>
              <CardDescription>
                AI-powered content creation workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Generate podcasts, blogs, and e-books with AI assistance
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/sync'}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
                Sync
              </CardTitle>
              <CardDescription>
                CRM synchronization and automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sync with Bigin by Zoho CRM automatically
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/reports'}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="w-6 h-6 text-purple-600 mr-3" />
                Reports
              </CardTitle>
              <CardDescription>
                Performance analytics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track performance with beautiful analytics
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}