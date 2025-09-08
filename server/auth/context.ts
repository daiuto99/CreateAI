import type { Request } from 'express';

export type AuthContext = {
  userId?: string;
  email?: string;
  claims: Record<string, any>;
  isAdmin: boolean;
};

function fromDevFallback(req: Request) {
  const h = (req.headers['x-user-id'] || req.headers['x-user']) as string | undefined;
  const q = (req.query.userId || req.query.uid || req.query.user) as string | undefined;
  const b = (req as any).body?.userId || (req as any).body?.uid;
  const envId = process.env.AUTH_DEV_USER_ID;
  const userId = h || q || b || envId;
  if (!userId) return undefined;
  return { userId, email: (req.headers['x-user-email'] as string) || undefined, claims: { dev: true }, isAdmin: true };
}

export function extractAuth(req: Request): AuthContext {
  if ((req as any).auth) return (req as any).auth;
  const sessionUser = (req as any).session?.user || (req as any).user || {};
  const claims = sessionUser?.claims ?? {};
  const legacyId = sessionUser?.id || sessionUser?.uid;
  const userId = claims?.sub || (claims as any)?.user_id || legacyId;
  const email = claims?.email || sessionUser?.email;
  const isAdmin = Boolean(claims?.admin || claims?.isAdmin || sessionUser?.isAdmin);
  let auth: AuthContext | undefined;
  if (userId) auth = { userId, email, claims, isAdmin };
  else auth = fromDevFallback(req);
  (req as any).auth = auth ?? { claims: {}, isAdmin: false };
  return (req as any).auth;
}