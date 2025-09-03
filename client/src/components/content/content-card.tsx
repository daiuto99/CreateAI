import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ContentProject {
  id: string;
  name: string;
  type: 'podcast' | 'blog' | 'ebook';
  status: 'outline' | 'draft' | 'review' | 'published' | 'archived';
  metadata?: any;
  settings?: any;
  progress?: number;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface ContentCardProps {
  project: ContentProject;
}

export default function ContentCard({ project }: ContentCardProps) {
  const getStatusBadge = (status: string) => {
    const statusClasses = {
      outline: 'status-outline',
      draft: 'status-draft',
      review: 'status-review',
      published: 'status-published',
      archived: 'status-archived'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status as keyof typeof statusClasses] || 'status-outline'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      podcast: 'fas fa-microphone',
      blog: 'fas fa-blog',
      ebook: 'fas fa-book'
    };
    return icons[type as keyof typeof icons] || 'fas fa-file';
  };

  const getHostType = (settings: any) => {
    if (project.type !== 'podcast' || !settings?.hostType) return null;
    
    const hostTypes = {
      single: 'Single Host',
      morning_show: 'Morning Show',
      interview: 'Interview Host'
    };
    
    return hostTypes[settings.hostType as keyof typeof hostTypes] || 'Single Host';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const progress = project.progress || 0;

  return (
    <Card className="content-card rounded-lg p-6 hover:border-primary transition-all duration-200" data-testid={`card-project-${project.id}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-2" data-testid={`text-project-name-${project.id}`}>
            {project.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {project.metadata?.description || `${project.type.charAt(0).toUpperCase() + project.type.slice(1)} project`}
          </p>
        </div>
        {getStatusBadge(project.status)}
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <i className={`${getTypeIcon(project.type)} w-4 h-4 mr-2`}></i>
          <span data-testid={`text-project-type-${project.id}`}>
            {getHostType(project.settings) || project.type.charAt(0).toUpperCase() + project.type.slice(1)}
          </span>
        </div>
        
        {project.itemCount !== undefined && (
          <div className="flex items-center text-sm text-muted-foreground">
            <i className="fas fa-file-alt w-4 h-4 mr-2"></i>
            <span data-testid={`text-item-count-${project.id}`}>
              {project.itemCount} {project.itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        )}
        
        <div className="flex items-center text-sm text-muted-foreground">
          <i className="fas fa-calendar w-4 h-4 mr-2"></i>
          <span data-testid={`text-updated-date-${project.id}`}>
            {formatDate(project.updatedAt)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="text-foreground font-medium" data-testid={`text-progress-${project.id}`}>
            {progress}%
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              project.status === 'published' ? 'bg-green-500' : 
              project.status === 'draft' ? 'bg-blue-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${Math.max(progress, 5)}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button 
          className="flex-1" 
          size="sm"
          data-testid={`button-continue-${project.id}`}
        >
          {project.status === 'published' ? 'View Details' : 'Continue'}
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="px-3"
          data-testid={`button-menu-${project.id}`}
        >
          <i className="fas fa-ellipsis-h w-4 h-4"></i>
        </Button>
      </div>
    </Card>
  );
}
