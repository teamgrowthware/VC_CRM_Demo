import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

vi.mock('../lib/config', () => ({
  requireJwtSecret: () => 'test-secret',
}));

import { authenticateToken, authorizeRoles, extractToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

const mockRes = () => {
  const res = {} as any;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

describe('extractToken', () => {
  it('prefers the cookie token', () => {
    const req = {
      cookies: { token: 'cookie-token' },
      headers: { authorization: 'Bearer header-token' },
    } as any as AuthRequest;
    expect(extractToken(req)).toBe('cookie-token');
  });

  it('falls back to the Authorization Bearer header', () => {
    const req = {
      cookies: {},
      headers: { authorization: 'Bearer header-token' },
    } as any as AuthRequest;
    expect(extractToken(req)).toBe('header-token');
  });

  it('returns null when no token exists anywhere', () => {
    const req = { cookies: {}, headers: {} } as any as AuthRequest;
    expect(extractToken(req)).toBeNull();
  });
});

describe('authenticateToken', () => {
  it('rejects requests without a token (401)', () => {
    const req = { cookies: {}, headers: {}, originalUrl: '/api/x' } as any as AuthRequest;
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects tampered / invalid tokens (403)', () => {
    const req = {
      cookies: {},
      headers: { authorization: 'Bearer not-a-real-token' },
      originalUrl: '/api/x',
    } as any as AuthRequest;
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid token and attaches the user payload', () => {
    const token = jwt.sign({ id: 'emp-1', role: 'ADMIN' }, 'test-secret');
    const req = {
      cookies: {},
      headers: { authorization: `Bearer ${token}` },
      originalUrl: '/api/x',
    } as any as AuthRequest;
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 'emp-1', role: 'ADMIN' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a token signed with the wrong secret (403)', () => {
    const token = jwt.sign({ id: 'emp-1', role: 'ADMIN' }, 'wrong-secret');
    const req = {
      cookies: {},
      headers: { authorization: `Bearer ${token}` },
      originalUrl: '/api/x',
    } as any as AuthRequest;
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authorizeRoles', () => {
  it('allows a user whose role is in the allowed list', () => {
    const req = { user: { id: 'emp-1', role: 'ADMIN' } } as any as AuthRequest;
    const res = mockRes();
    const next = vi.fn();

    authorizeRoles('ADMIN', 'HR')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks a user whose role is not in the allowed list (403)', () => {
    const req = { user: { id: 'emp-1', role: 'EMPLOYEE' } } as any as AuthRequest;
    const res = mockRes();
    const next = vi.fn();

    authorizeRoles('ADMIN')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks requests with no authenticated user (403)', () => {
    const req = {} as any as AuthRequest;
    const res = mockRes();
    const next = vi.fn();

    authorizeRoles('ADMIN')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
