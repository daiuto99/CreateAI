import type { Request, Response, NextFunction } from 'express';
import { extractAuth } from './context';

export function attachAuth(req: Request, _res: Response, next: NextFunction) {
  extractAuth(req);
  next();
}