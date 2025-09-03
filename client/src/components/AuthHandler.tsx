import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { handleRedirectResult } from '@/lib/firebase';

export function AuthHandler() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        console.log('Checking for auth redirect result...');
        const result = await handleRedirectResult();
        console.log('Redirect result:', result);
        
        if (result) {
          console.log('User signed in successfully:', result.user.email);
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
          
          console.log('Redirecting to:', targetRoute);
          setLocation(targetRoute);
        } else {
          console.log('No redirect result found');
        }
      } catch (error) {
        console.error('Error handling auth redirect:', error);
        alert('Auth redirect error: ' + error);
      }
    };

    handleAuthRedirect();
  }, [setLocation]);

  return null; // This component doesn't render anything
}