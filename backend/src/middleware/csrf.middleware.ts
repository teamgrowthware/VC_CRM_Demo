import { Request, Response, NextFunction } from 'express';

const CSRF_HEADER = 'x-csrf-token';

// These endpoints manage the session itself and must always work without a CSRF token:
// - login/register start without cookies (and are rate-limited)
// - refresh rotates tokens using the httpOnly refreshToken cookie; the response cannot
//   be read by a third-party origin (SameSite + CORS)
// - logout must always succeed so the user can clear a compromised session
const CSRF_SKIP_PATHS = [
  '/api/auth/login',
  '/api/auth/client-login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

export const csrfProtect = (req: Request, res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (CSRF_SKIP_PATHS.some((p) => req.originalUrl.split('?')[0].endsWith(p))) {
    return next();
  }

  // CSRF protection only applies to cookie-authenticated requests.
  // Bearer-token clients (desktop app, scripts) are not browser-based and not at CSRF risk.
  if (!req.cookies?.token) {
    return next();
  }

  const cookieCsrf = req.cookies?.csrfToken;
  const headerCsrf = req.headers[CSRF_HEADER];

  if (!cookieCsrf || !headerCsrf || cookieCsrf !== headerCsrf) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }

  next();
};
