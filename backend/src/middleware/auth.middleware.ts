import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '../lib/config';

interface AuthRequest extends Request {
  user?: any;
}

import { contextStorage } from '../lib/prisma';

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn('[AUTH] No token provided for request:', req.originalUrl);
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.error('[AUTH] JWT verification failed:', err.message, 'Header:', authHeader?.substring(0, 20) + '...');
      return res.status(403).json({ 
        error: 'Invalid or expired token', 
        details: err.message,
        hint: 'Try logging out and logging back in' 
      });
    }
    req.user = user;
    
    // Check if the user is a demo user (e.g., email starts with demo or contains demo)
    const isDemo = user?.email?.toLowerCase().includes('demo');
    
    contextStorage.run({ isDemo }, () => {
      next();
    });
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
