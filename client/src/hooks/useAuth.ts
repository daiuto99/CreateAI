import { useState, useEffect } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChange } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? { email: firebaseUser.email, displayName: firebaseUser.displayName } : null);
      setUser(firebaseUser);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
