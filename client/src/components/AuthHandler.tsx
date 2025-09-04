import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { handleRedirectResult } from '@/lib/firebase';

export function AuthHandler() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        const result = await handleRedirectResult();
        if (result) {
          console.log('Authentication successful via redirect');
          
          // User successfully signed in, check for stored feature preference
          const pendingFeature = localStorage.getItem('pendingFeature');
          if (pendingFeature) {
            localStorage.removeItem('pendingFeature'); // Clean up
          }
          
          // Map feature names to routes
          const featureRoutes: Record<string, string> = {
            'The Lab': '/lab',
            'Sync': '/sync',
            'Reports': '/reports',
            'Dashboard': '/dashboard'
          };
          
          const targetRoute = pendingFeature && featureRoutes[pendingFeature] 
            ? featureRoutes[pendingFeature] 
            : '/'; // Navigate to landing page which will show authenticated state
          
          // Small delay to ensure auth state is updated
          setTimeout(() => {
            setLocation(targetRoute);
          }, 100);
        }
      } catch (error) {
        console.error('Error handling auth redirect:', error);
        // Don't show error to user as this runs on every page load
      }
    };

    handleAuthRedirect();
  }, [setLocation]);

  return null; // This component doesn't render anything
}