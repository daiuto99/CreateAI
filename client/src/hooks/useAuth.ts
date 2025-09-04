import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

type AuthStatus = "loading" | "authed" | "guest";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    // console.log('🔥 useAuth: Setting up Firebase auth state listener');
    
    const unsub = onAuthStateChanged(auth, (u) => {
      // console.log('🔥 Firebase auth state changed:', {
      //   hasUser: !!u,
      //   uid: u?.uid,
      //   email: u?.email,
      //   displayName: u?.displayName,
      //   photoURL: u?.photoURL,
      //   emailVerified: u?.emailVerified,
      //   timestamp: new Date().toISOString()
      // });
      
      setFirebaseUser(u);
      const newStatus = u ? "authed" : "guest";
      setStatus(newStatus);
      
      // console.log('🔥 Auth status updated to:', newStatus);
      
      // Debug storage for troubleshooting
      try {
        sessionStorage.setItem('debug-auth-state', JSON.stringify({
          timestamp: new Date().toISOString(),
          hasUser: !!u,
          status: newStatus,
          uid: u?.uid,
          email: u?.email,
          url: window.location.href
        }));
        // console.log('🔥 Auth debug info saved to sessionStorage');
      } catch (e) {
        // console.warn('⚠️ Failed to store auth debug info:', e);
      }
    });

    return () => {
      // console.log('🔥 useAuth: Cleaning up auth listener');
      unsub();
    };
  }, []);

  return { firebaseUser, status };
}