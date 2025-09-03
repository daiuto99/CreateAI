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
          // User successfully signed in, redirect to dashboard by default
          setLocation('/dashboard');
        }
      } catch (error) {
        console.error('Error handling auth redirect:', error);
      }
    };

    handleAuthRedirect();
  }, [setLocation]);

  return null; // This component doesn't render anything
}