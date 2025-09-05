import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Request, Response, NextFunction } from 'express';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  // For production, you'd want to use a service account key
  // For now, we'll initialize without credentials for development
  initializeApp();
}

const auth = getAuth();

// Middleware to verify Firebase ID tokens
export const verifyFirebaseToken = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Extract token from Bearer header or check for token in cookies
    let idToken: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.slice(7);
    }
    
    if (!idToken) {
      // Try to get token from request body for compatibility
      idToken = req.body?.idToken || req.query?.idToken;
    }
    
    if (!idToken) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }
    
    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      claims: decodedToken
    };
    
    next();
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    res.status(401).json({ message: 'Invalid authentication token' });
  }
};

// Enhanced middleware that also handles session-based auth for compatibility
export const isAuthenticated = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    // First try Firebase token authentication
    const authHeader = req.headers.authorization;
    let idToken: string | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.slice(7);
    }
    
    if (idToken) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          claims: {
            sub: decodedToken.uid,
            email: decodedToken.email
          }
        };
        return next();
      } catch (error) {
        console.error('Firebase token verification failed:', error);
      }
    }
    
    // Fallback to session-based auth (for existing Replit auth)
    if ((req as any).user && (req as any).user.claims) {
      return next();
    }
    
    return res.status(401).json({ message: 'Authentication required' });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};