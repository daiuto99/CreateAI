import { Link, useLocation } from "wouter";

const navigation = [
  { name: 'Lab', href: '/lab', icon: 'fas fa-flask' },
  { name: 'Sync', href: '/sync', icon: 'fas fa-sync' },
  { name: 'Reports', href: '/reports', icon: 'fas fa-chart-line' },
  { name: 'Dashboard', href: '/dashboard', icon: 'fas fa-tachometer-alt' },
];

export default function MobileNav() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
      <div className="flex items-center justify-around py-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center py-2 px-3 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
              data-testid={`mobile-link-${item.name.toLowerCase()}`}
            >
              <i className={`${item.icon} text-lg`}></i>
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
