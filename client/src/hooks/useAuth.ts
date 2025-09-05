import { useEffect, useState } from "react";
import { createAuthStateListener, ReplitUser, AuthStatus } from "@/lib/firebase";

export function useAuth() {
  const [replitUser, setReplitUser] = useState<ReplitUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const cleanup = createAuthStateListener((user, authStatus) => {
      setReplitUser(user);
      setStatus(authStatus);
      
      // Debug storage for troubleshooting
      try {
        sessionStorage.setItem('debug-auth-state', JSON.stringify({
          timestamp: new Date().toISOString(),
          hasUser: !!user,
          status: authStatus,
          userId: user?.id,
          email: user?.email,
          url: window.location.href
        }));
      } catch (e) {
        console.warn('⚠️ Failed to store auth debug info:', e);
      }
    });

    return cleanup;
  }, []);

  // Provide Firebase-compatible interface for existing components
  return { 
    firebaseUser: replitUser ? {
      uid: replitUser.id,
      email: replitUser.email,
      displayName: `${replitUser.firstName} ${replitUser.lastName}`,
      emailVerified: true // Assume Replit users are verified
    } : null,
    replitUser,
    status 
  };
}