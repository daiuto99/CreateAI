import type { Request } from 'express';

export type AuthContext = {
  userId?: string;
  email?: string;
  claims: Record<string, any>;
  isAdmin: boolean;
};

export function extractAuth(req: Request): AuthContext {
  const sessionUser = (req as any).session?.user || (req as any).user || {};
  const claims = sessionUser?.claims ?? {};
  const legacyId = sessionUser?.id || sessionUser?.uid;

  const userId: string | undefined =
    claims?.sub || legacyId || (claims?.user_id as string | undefined);

  const email: string | undefined = claims?.email || sessionUser?.email;

  const isAdmin: boolean = Boolean(
    claims?.admin || claims?.isAdmin || sessionUser?.isAdmin
  );

  const auth: AuthContext = { userId, email, claims, isAdmin };
  (req as any).auth = auth;
  return auth;
}