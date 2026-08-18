import dotenv from 'dotenv';
import path from 'path';

// Load environment variables in non-production environments
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.resolve(__dirname, '../../.env');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.warn('Warning: Could not load .env file from', envPath);
  }
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const REFRESH_SECRET = process.env.REFRESH_SECRET || process.env.JWT_SECRET;
export const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h';
export const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const ADMIN_OTP_CODE = process.env.ADMIN_OTP_CODE;
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
export const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
export const PORT = process.env.PORT || 5000;
export const DATABASE_URL = process.env.DATABASE_URL;

if (!JWT_SECRET) {
  console.warn('[CONFIG] WARNING: JWT_SECRET is not set. Authentication will fail.');
}
if (!ADMIN_EMAIL) {
  console.warn('[CONFIG] WARNING: ADMIN_EMAIL is not set. Password reset will not work.');
}

export function requireJwtSecret(): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
  return JWT_SECRET;
}

export function requireRefreshSecret(): string {
  if (!REFRESH_SECRET) throw new Error('REFRESH_SECRET environment variable is required');
  return REFRESH_SECRET;
}

export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || 'Vortex Cubes <noreply@vortexcubes.com>'
};

console.log('Backend configuration loaded.');
