import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { signOutUser } from "@/lib/firebase";

// Import custom icons
import labIcon from '@assets/generated_images/The_Lab_AI_content_creation_icon_f26cd1d3.png'
import syncIcon from '@assets/generated_images/CRM_synchronization_workflow_icon_8587610e.png'
import reportsIcon from '@assets/generated_images/Analytics_reports_dashboard_icon_aa8cffd8.png'
import dashboardIcon from '@assets/generated_images/KPI_dashboard_interface_icon_1c62cc62.png'
import createAILogo from '@assets/generated_images/createai_logo.png'

const navigation = [
  { name: 'The Lab', href: '/lab', icon: labIcon },
  { name: 'Sync', href: '/sync', icon: syncIcon },
  { name: 'Reports', href: '/reports', icon: reportsIcon },
  { name: 'Dashboard', href: '/dashboard', icon: dashboardIcon },
  { name: 'Settings', href: '/integrations', icon: 'fas fa-cog' },
];

const mockProjects = [
  { name: 'Tech Talk Weekly', href: '/lab/projects/tech-talk', icon: 'fas fa-microphone' },
  { name: 'Marketing Blog', href: '/lab/projects/marketing-blog', icon: 'fas fa-blog' },
  { name: 'AI Guide 2024', href: '/lab/projects/ai-guide', icon: 'fas fa-book' },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { firebaseUser } = useAuth();

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border hidden lg:flex flex-col">
      {/* Logo */}
      <div className="flex items-center h-24 px-6 border-b border-border">
        <Link href="/" className="flex items-center" data-testid="link-home">
          <img 
            src={createAILogo} 
            alt="CreateAI" 
            className="h-32 w-auto"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} data-testid={`link-${item.name.toLowerCase().replace(' ', '-')}`}>
                <div
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {typeof item.icon === 'string' && item.icon.startsWith('fas') ? (
                    <i className={`${item.icon} w-5 h-5 mr-3`}></i>
                  ) : (
                    <img src={item.icon as string} alt={`${item.name} icon`} className="w-5 h-5 mr-3" />
                  )}
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Projects Section */}
        <div className="pt-6">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Projects
          </p>
          <div className="mt-2 space-y-1">
            {mockProjects.map((project) => (
              <Link key={project.name} href={project.href} data-testid={`link-project-${project.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                  <i className={`${project.icon} w-4 h-4 mr-3`}></i>
                  {project.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          {firebaseUser?.photoURL ? (
            <img
              src={firebaseUser.photoURL}
              alt="User avatar"
              className="w-8 h-8 rounded-full object-cover"
              data-testid="img-user-avatar"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {(firebaseUser?.displayName?.charAt(0) || firebaseUser?.email?.charAt(0) || '?').toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="text-user-name">
              {firebaseUser?.displayName || firebaseUser?.email || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-role">
              Member
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOutUser()}
            className="text-muted-foreground hover:text-foreground p-2"
            data-testid="button-logout"
          >
            <i className="fas fa-sign-out-alt w-4 h-4"></i>
          </Button>
        </div>
      </div>
    </div>
  );
}
