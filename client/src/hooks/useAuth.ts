import { useState, useEffect } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChange } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type BackendUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string | null;
  profileImageUrl?: string;
  organizations?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
};

export type User = FirebaseUser & Partial<BackendUser>;

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setFirebaseUser(user);
      setIsFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch backend user data when firebase user is available
  const { data: backendUser, isLoading: isBackendLoading } = useQuery<BackendUser>({
    queryKey: ['/api/auth/user'],
    enabled: !!firebaseUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const user: User | null = firebaseUser ? {
    ...firebaseUser,
    ...(backendUser || {}),
  } : null;

  return {
    user,
    isLoading: isFirebaseLoading || (firebaseUser && isBackendLoading),
    isAuthenticated: !!firebaseUser,
  };
}
