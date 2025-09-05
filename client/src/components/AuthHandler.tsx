import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { handleRedirectResult } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

export function AuthHandler() {
  const [, setLocation] = useLocation();
  const { firebaseUser } = useAuth();

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

  // Bridge Firebase auth to backend when user is authenticated
  useEffect(() => {
    if (firebaseUser) {
      const bridgeAuth = async () => {
        try {
          const idToken = await firebaseUser.getIdToken();
          await apiRequest('POST', '/api/auth/firebase-bridge', { idToken });
          console.log('✅ Firebase auth bridged to backend successfully');
        } catch (error) {
          console.error('❌ Failed to bridge Firebase auth to backend:', error);
        }
      };
      
      bridgeAuth();
    }
  }, [firebaseUser]);

  return null; // This component doesn't render anything
}