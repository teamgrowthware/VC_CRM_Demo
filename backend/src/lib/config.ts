import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env in all environments (demo is self-contained)
const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.warn('Warning: Could not load .env file from', envPath);
}

export const JWT_SECRET = process.env.JWT_SECRET || 'vortex-cubes-default-secret-2026';
export const PORT = process.env.PORT || 5000;
export const DATABASE_URL = process.env.DATABASE_URL;
export const DEMO_DATABASE_URL = process.env.DEMO_DATABASE_URL;

export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || 'Vortex Cubes <no-reply@vortexcubes.com>'
};

console.log('Backend configuration loaded.');
console.log('JWT_SECRET loaded:', JWT_SECRET ? `${JWT_SECRET.substring(0, 3)}...${JWT_SECRET.slice(-3)}` : 'MISSING');
