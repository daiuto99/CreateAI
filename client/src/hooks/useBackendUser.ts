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
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch backend user");
      return res.json();
    },
    enabled: !!firebaseUser, // only runs after firebaseUser exists
    staleTime: 60_000,
    retry: false,
  });
}