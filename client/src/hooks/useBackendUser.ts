import { useQuery } from "@tanstack/react-query";
import type { User } from "firebase/auth";

type Org = { id: string; name?: string; role?: string };
type BackendUser = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  organizations?: Org[];
};

export function useBackendUser(firebaseUser: User | null) {
  return useQuery<BackendUser>({
    queryKey: ["/api/auth/user", firebaseUser?.uid ?? null],
    queryFn: async () => {
      // console.log('👤 Fetching backend user data for Firebase user:', {
      //   uid: firebaseUser?.uid,
      //   email: firebaseUser?.email,
      //   timestamp: new Date().toISOString()
      // });
      
      // Get Firebase ID token for authentication
      const idToken = await firebaseUser?.getIdToken();
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      
      const res = await fetch("/api/auth/user", { 
        credentials: "include",
        headers
      });
      
      // console.log('👤 Backend user response:', {
      //   status: res.status,
      //   statusText: res.statusText,
      //   ok: res.ok,
      //   url: res.url
      // });
      
      if (!res.ok) {
        const errorText = await res.text();
        // console.error('👤 Backend user fetch failed:', {
        //   status: res.status,
        //   statusText: res.statusText,
        //   error: errorText
        // });
        throw new Error(`Failed to fetch backend user: ${res.status} ${errorText}`);
      }
      
      const userData = await res.json();
      // console.log('👤 Backend user data received:', {
      //   id: userData.id,
      //   email: userData.email,
      //   firstName: userData.firstName,
      //   lastName: userData.lastName,
      //   organizationsCount: userData.organizations?.length || 0,
      //   organizations: userData.organizations,
      //   timestamp: new Date().toISOString()
      // });
      
      // Store debug info
      try {
        sessionStorage.setItem('debug-backend-user', JSON.stringify({
          timestamp: new Date().toISOString(),
          userData,
          firebaseUid: firebaseUser?.uid
        }));
        console.log('👤 Backend user debug info saved to sessionStorage');
      } catch (e) {
        console.warn('⚠️ Failed to store backend user debug info:', e);
      }
      
      return userData;
    },
    enabled: !!firebaseUser, // only runs after firebaseUser exists
    staleTime: 60_000,
    retry: false,
  });
}