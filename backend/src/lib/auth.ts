import { Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  requireJwtSecret,
  requireRefreshSecret,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  IS_PRODUCTION,
} from './config';

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

type ExpiresIn = jwt.SignOptions['expiresIn'];

export const signAccessToken = (employee: TokenPayload): string => {
  return jwt.sign(
    { id: employee.id, email: employee.email, role: employee.role },
    requireJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY as ExpiresIn }
  );
};

export const signRefreshToken = (employee: TokenPayload): string => {
  return jwt.sign(
    { id: employee.id, email: employee.email, role: employee.role, type: 'refresh' },
    requireRefreshSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRY as ExpiresIn }
  );
};

export const generateCsrfToken = (): string => crypto.randomBytes(32).toString('hex');

const authCookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? ('none' as const) : ('lax' as const),
  path: '/',
};

const csrfCookieOptions = {
  httpOnly: false,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? ('none' as const) : ('lax' as const),
  path: '/',
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const csrfToken = generateCsrfToken();
  res.cookie('token', accessToken, { ...authCookieOptions, maxAge: 60 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...authCookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.cookie('csrfToken', csrfToken, { ...csrfCookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  return csrfToken;
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie('token', authCookieOptions);
  res.clearCookie('refreshToken', authCookieOptions);
  res.clearCookie('csrfToken', csrfCookieOptions);
};
