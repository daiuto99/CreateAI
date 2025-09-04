import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import Header from "@/components/layout/header";
import { useAuth } from "@/hooks/useAuth";

interface ContentProject {
  id: string;
  name: string;
  type: 'podcast' | 'blog' | 'ebook';
  status: string;
  organizationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  settings?: any;
  metadata?: any;
  itemCount?: number;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { firebaseUser } = useAuth();

  const { data: project, isLoading, error } = useQuery<ContentProject>({
    queryKey: ['/api/content-projects/detail', id],
    queryFn: async () => {
      console.log('🔍 Fetching project details for:', id);
      
      const response = await fetch(`/api/content-projects/${id}`, {
        credentials: 'include'
      });

      console.log('🔍 Project detail response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Failed to fetch project details:', errorText);
        throw new Error(`Failed to fetch project: ${response.status} ${errorText}`);
      }

      const projectData = await response.json();
      console.log('🔍 Project data received:', projectData);
      
      return projectData;
    },
    enabled: !!id,
    retry: false,
  });

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'review':
        return 'bg-blue-100 text-blue-800';
      case 'outline':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to continue.</p>
          <Button onClick={() => window.location.href = "/api/login"}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <MobileNav />
          <Header 
            title={project ? project.name : 'Loading...'}
            action={
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation('/lab')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Lab
              </Button>
            }
          />
          
          <main className="flex-1 overflow-auto">
            <div className="p-6 space-y-8">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg animate-pulse mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading project...</p>
                </div>
              ) : error ? (
                <Card className="border-red-200">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="text-4xl mb-4">❌</div>
                    <h3 className="text-lg font-medium mb-2">Error Loading Project</h3>
                    <p className="text-muted-foreground text-center">
                      {error instanceof Error ? error.message : 'Unknown error occurred'}
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setLocation('/lab')}
                    >
                      Back to Lab
                    </Button>
                  </CardContent>
                </Card>
              ) : project ? (
                <div className="space-y-6">
                  {/* Project Header */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="flex items-center gap-3 text-2xl">
                            <span className="text-3xl">{getProjectIcon(project.type)}</span>
                            {project.name}
                          </CardTitle>
                          <CardDescription className="text-base">
                            {project.type.charAt(0).toUpperCase() + project.type.slice(1)} Project
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Updated</p>
                          <p className="font-medium">
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Content Items</p>
                          <p className="font-medium">{project.itemCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p className="font-medium">{project.type}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                      <CardDescription>
                        What would you like to do with this project?
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button 
                          className="h-20 flex-col gap-2"
                          variant="outline"
                          disabled
                        >
                          <span className="text-2xl">✍️</span>
                          <span>Create Content</span>
                        </Button>
                        <Button 
                          className="h-20 flex-col gap-2"
                          variant="outline"
                          disabled
                        >
                          <span className="text-2xl">⚙️</span>
                          <span>Settings</span>
                        </Button>
                        <Button 
                          className="h-20 flex-col gap-2"
                          variant="outline"
                          disabled
                        >
                          <span className="text-2xl">📊</span>
                          <span>Analytics</span>
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        More features coming soon! This project detail page is now functional.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}