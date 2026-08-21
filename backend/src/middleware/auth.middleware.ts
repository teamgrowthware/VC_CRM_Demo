import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { requireJwtSecret } from '../lib/config';

export interface AuthRequest extends Request {
  user?: any;
}

export const extractToken = (req: AuthRequest): string | null => {
  const cookieToken = req.cookies?.token;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  if (headerToken) return headerToken;

  return null;
};

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    console.warn('[AUTH] No token provided for request:', req.originalUrl);
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, requireJwtSecret(), (err: any, user: any) => {
    if (err) {
      console.error('[AUTH] JWT verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    next();
  };
};
