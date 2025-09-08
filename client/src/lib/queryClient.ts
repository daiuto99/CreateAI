import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiRequest as baseApiRequest } from '@/lib/api';

// Legacy support - URL-first pattern
export async function apiRequest<T = any>(
  url: string,
  options: { method?: string; data?: unknown } = {}
): Promise<T> {
  const { method = 'GET', data } = options;
  console.log('🌍 API Request:', {
    method,
    url,
    data,
    timestamp: new Date().toISOString()
  });
  
  try {
    const result = await baseApiRequest(url, method as any, data);
    console.log('🌍 API Response:', {
      method,
      url,
      status: 200,
      statusText: 'OK',
      ok: true,
      timestamp: new Date().toISOString()
    });
    return result;
  } catch (error: any) {
    console.error('🌍 API Error:', error.message);
    throw error;
  }
}

// Legacy apiMutate for compatibility
export const apiMutate = <T=any>(url: string, method: 'POST'|'PUT'|'PATCH'|'DELETE', data?: unknown) =>
  baseApiRequest<T>(url, method, data);

export const apiQuery = <T=any>(url: string) =>
  baseApiRequest<T>(url, 'GET');

// Query function for TanStack Query
const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const url = Array.isArray(queryKey) ? queryKey[0] as string : queryKey as string;
  return apiQuery(url);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

export default queryClient;