// Replit Authentication Helper Functions
// This file provides authentication utilities using Replit's built-in auth system

type ReplitUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizations?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
};

// Auth state type
type AuthStatus = "loading" | "authed" | "guest";

// Sign in with Replit Auth
export const signInWithReplit = () => {
  window.location.href = '/api/login';
};

// Sign out from Replit Auth
export const signOutUser = () => {
  window.location.href = '/api/logout';
};

// Check current authentication status
export const checkAuthStatus = async (): Promise<{ user: ReplitUser | null; status: AuthStatus }> => {
  try {
    const response = await fetch('/api/auth/user', { credentials: 'include' });
    
    if (response.ok) {
      const user = await response.json();
      return { user, status: 'authed' };
    } else if (response.status === 401 || response.status === 404) {
      return { user: null, status: 'guest' };
    } else {
      throw new Error(`Auth check failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Auth status check failed:', error);
    return { user: null, status: 'guest' };
  }
};

// Auth state change listener (polling-based for Replit auth)
export const createAuthStateListener = (callback: (user: ReplitUser | null, status: AuthStatus) => void) => {
  let intervalId: NodeJS.Timeout;
  let lastAuthState: { user: ReplitUser | null; status: AuthStatus } | null = null;
  
  const pollAuthState = async () => {
    try {
      const currentAuthState = await checkAuthStatus();
      
      // Only call callback if auth state changed
      if (!lastAuthState || 
          JSON.stringify(lastAuthState) !== JSON.stringify(currentAuthState)) {
        lastAuthState = currentAuthState;
        callback(currentAuthState.user, currentAuthState.status);
      }
    } catch (error) {
      console.error('Auth polling error:', error);
    }
  };
  
  // Initial check
  pollAuthState();
  
  // Poll every 5 seconds
  intervalId = setInterval(pollAuthState, 5000);
  
  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};

// Export types
export type { ReplitUser, AuthStatus };

// Legacy Firebase compatibility
export const auth = null; // Deprecated - use Replit auth functions instead