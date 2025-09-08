import type { Request, Response, NextFunction } from 'express';

export type AuthContext = {
  userId?: string;
  email?: string;
  claims?: Record<string, any>;
  isAdmin?: boolean;
};

// Extract a consistent auth context from whatever the app has available
export function extractAuth(req: Request): AuthContext {
  const u: any =
    (req as any).user ||
    (req as any).authUser ||
    (req as any).session?.user ||
    ((req as any).userId ? { id: (req as any).userId } : null);

  const claims =
    u?.claims ||
    (req as any).session?.claims ||
    (req as any).session?.user?.claims ||
    {};

  const userId = u?.uid || u?.id || (req as any).userId;
  const email = u?.email;

  const isAdmin =
    !!(claims.admin || claims.isAdmin || claims.role === 'admin' || u?.role === 'admin');

  const auth: AuthContext = { userId, email, claims, isAdmin };
  (req as any).auth = auth;
  return auth;
}

// Middleware that **skips** auth for explicit public paths, else enforces it
export function requireAuthWithPublic(publicPaths: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (publicPaths.includes(req.path)) return next();

    const auth = extractAuth(req);
    if (!auth.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  };
}