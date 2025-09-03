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
          // User successfully signed in, check for stored feature preference
          const pendingFeature = localStorage.getItem('pendingFeature');
          localStorage.removeItem('pendingFeature'); // Clean up
          
          // Map feature names to routes
          const featureRoutes: Record<string, string> = {
            'The Lab': '/lab',
            'CRM Sync': '/sync',
            'Reports': '/reports',
            'Dashboard': '/dashboard'
          };
          
          const targetRoute = pendingFeature && featureRoutes[pendingFeature] 
            ? featureRoutes[pendingFeature] 
            : '/dashboard'; // Default fallback
          
          setLocation(targetRoute);
        }
      } catch (error) {
        console.error('Error handling auth redirect:', error);
      }
    };

    handleAuthRedirect();
  }, [setLocation]);

  return null; // This component doesn't render anything
}