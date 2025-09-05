import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log('🌍 API Request:', {
    method,
    url,
    data,
    timestamp: new Date().toISOString()
  });
  
  // Get Firebase ID token for authentication
  const user = auth.currentUser;
  const idToken = user ? await user.getIdToken() : null;
  
  const headers: HeadersInit = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  
  console.log('🌍 API Response:', {
    method,
    url,
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    timestamp: new Date().toISOString()
  });
  
  // Log error details before throwing
  if (!res.ok) {
    try {
      const errorText = await res.clone().text();
      console.error('🌍 API Error Response Body:', errorText);
      
      // Store API error debug info
      sessionStorage.setItem('debug-last-api-error', JSON.stringify({
        timestamp: new Date().toISOString(),
        method,
        url,
        status: res.status,
        statusText: res.statusText,
        errorBody: errorText,
        requestData: data
      }));
    } catch (e) {
      console.warn('Failed to read error response body:', e);
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get Firebase ID token for authentication
    const user = auth.currentUser;
    const idToken = user ? await user.getIdToken() : null;
    
    const headers: HeadersInit = {};
    if (idToken) {
      headers["Authorization"] = `Bearer ${idToken}`;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('401');
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
