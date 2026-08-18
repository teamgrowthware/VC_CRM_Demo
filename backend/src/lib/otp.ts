import crypto from 'crypto';
import { OTP_EXPIRY_MINUTES } from './config';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  lastRequestAt: number;
}

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 5;

const store = new Map<string, OtpEntry>();
const requestCounts = new Map<string, number[]>();

const now = () => Date.now();

export const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const issueOtp = (key: string): { code: string; cooldownMs: number } | null => {
  const existing = store.get(key);
  if (existing && now() < existing.lastRequestAt + RESEND_COOLDOWN_MS) {
    return { code: '', cooldownMs: existing.lastRequestAt + RESEND_COOLDOWN_MS - now() };
  }

  const code = generateOtp();
  store.set(key, {
    code,
    expiresAt: now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    attempts: 0,
    lastRequestAt: now(),
  });

  const timestamps = (requestCounts.get(key) || []).filter((t) => now() - t < 60 * 60 * 1000);
  timestamps.push(now());
  requestCounts.set(key, timestamps);

  return { code, cooldownMs: 0 };
};

export const canRequestOtp = (key: string): boolean => {
  const timestamps = (requestCounts.get(key) || []).filter((t) => now() - t < 60 * 60 * 1000);
  return timestamps.length < MAX_REQUESTS_PER_HOUR;
};

export const verifyOtp = (key: string, code: string): { valid: boolean; attemptsRemaining: number } => {
  const entry = store.get(key);
  if (!entry) {
    return { valid: false, attemptsRemaining: 0 };
  }
  if (now() > entry.expiresAt) {
    store.delete(key);
    return { valid: false, attemptsRemaining: 0 };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    return { valid: false, attemptsRemaining: 0 };
  }

  if (entry.code === code) {
    store.delete(key);
    return { valid: true, attemptsRemaining: MAX_ATTEMPTS };
  }

  entry.attempts += 1;
  store.set(key, entry);
  return { valid: false, attemptsRemaining: MAX_ATTEMPTS - entry.attempts };
};

export const invalidateOtp = (key: string): void => {
  store.delete(key);
};
