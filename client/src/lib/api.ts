export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function apiRequest<T = any>(
  url: string,
  method: HttpMethod = 'GET',
  data?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include', // <-- IMPORTANT for session cookies
  });

  // Try to parse JSON, but include useful text if server returns non-JSON
  const text = await res.text();
  const json = (() => { try { return JSON.parse(text); } catch { return null; } })();

  if (!res.ok) {
    const detail = json ?? text;
    throw new Error(`API ${method} ${url} ${res.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
  return (json ?? ({} as T)) as T;
}

export const apiGet = <T=any>(url: string) => apiRequest<T>(url, 'GET');
export const apiPost = <T=any>(url: string, data?: unknown) => apiRequest<T>(url, 'POST', data);
export const apiPatch = <T=any>(url: string, data?: unknown) => apiRequest<T>(url, 'PATCH', data);
export const apiDel = <T=any>(url: string) => apiRequest<T>(url, 'DELETE');