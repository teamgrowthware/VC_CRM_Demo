import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { z } from 'zod';

import { requireRefreshSecret, ADMIN_OTP_CODE, ADMIN_EMAIL } from '../lib/config';
import { sendWelcomeEmail, sendOtpEmail } from '../services/email.service';
import { setAuthCookies, clearAuthCookies, signAccessToken, signRefreshToken } from '../lib/auth';
import { PASSWORD_REGEX, PASSWORD_POLICY_MESSAGE } from '../lib/validation';
import { logAudit } from '../lib/audit';
import { AuthRequest } from '../middleware/auth.middleware';
import { issueOtp, verifyOtp, canRequestOtp, invalidateOtp } from '../lib/otp';

const sanitizeEmployee = (employee: any) => {
  if (!employee) return null;
  const { password, ...safe } = employee;
  return safe;
};

const sanitizeClient = (client: any) => {
  if (!client) return null;
  const { password, ...safe } = client;
  return safe;
};

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().regex(PASSWORD_REGEX, PASSWORD_POLICY_MESSAGE),
  departmentId: z.string().optional(),
  designation: z.string().optional(),
  role: z.enum(['ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE']).optional(),
});

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);
    let { name, email, password, departmentId, designation, role } = validatedData;
    email = email.toLowerCase().trim();

    const existingUser = await prisma.employee.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { employeeId: 'desc' },
    });
    let nextIdNumber = 1;
    if (lastEmployee) {
      const match = lastEmployee.employeeId.match(/\d+$/);
      if (match) {
        nextIdNumber = parseInt(match[0], 10) + 1;
      }
    }
    const employeeId = `VC${nextIdNumber.toString().padStart(3, '0')}`;

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        password: hashedPassword,
        departmentId: departmentId,
        designation: designation || 'Employee',
        role: role || 'EMPLOYEE',
        employeeId,
      },
    });

    await sendWelcomeEmail(employee.email, employee.name);

    await logAudit({
      userId: req.user?.id,
      action: 'EMPLOYEE_REGISTERED',
      message: `${req.user?.name || 'Admin'} registered ${name} as ${role || 'EMPLOYEE'}`,
      entityType: 'EMPLOYEE',
      entityId: employee.id,
    });

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      data: sanitizeEmployee(employee),
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to register employee' });
    }
  }
};

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  otp: z.string().optional(),
});

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export const clearLoginLockout = (email: string): boolean => {
  const key = email.toLowerCase().trim();
  if (loginAttempts.has(key)) {
    loginAttempts.delete(key);
    return true;
  }
  return false;
};

export const getLoginLockouts = () => {
  const now = Date.now();
  const result: { email: string; locked: boolean; attempts: number; unlockAt?: string }[] = [];
  loginAttempts.forEach((val, key) => {
    result.push({
      email: key,
      locked: val.lockedUntil > now,
      attempts: val.count,
      unlockAt: val.lockedUntil > now ? new Date(val.lockedUntil).toISOString() : undefined
    });
  });
  return result;
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);
    let { email, password, otp } = validatedData;
    email = email.toLowerCase().trim();

    const attempt = loginAttempts.get(email);
    if (attempt && attempt.lockedUntil > Date.now()) {
      res.status(429).json({ success: false, message: 'Account temporarily locked. Try again later.' });
      return;
    }

    const employee = await prisma.employee.findUnique({ where: { email } });

    if (!employee) {
      recordFailedAttempt(email);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      recordFailedAttempt(email);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    if (employee.status !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Account is inactive' });
      return;
    }

    // Optional second factor for admin logins (configured via ADMIN_OTP_CODE env)
    if (employee.role === 'ADMIN' && ADMIN_OTP_CODE) {
      if (!otp || otp !== ADMIN_OTP_CODE) {
        recordFailedAttempt(email);
        res.status(403).json({ success: false, message: 'OTP is required for admin login' });
        return;
      }
    }

    loginAttempts.delete(email);

    const accessToken = signAccessToken(employee);
    const refreshToken = signRefreshToken(employee);
    const csrfToken = setAuthCookies(res, accessToken, refreshToken);

    await logAudit({
      userId: employee.id,
      action: 'LOGIN',
      message: `${employee.name} logged in`,
      entityType: 'AUTH',
      entityId: employee.id,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      csrfToken,
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to login' });
    }
  }
};

const recordFailedAttempt = (email: string) => {
  const current = loginAttempts.get(email);
  const count = (current?.count || 0) + 1;
  const lockedUntil = count >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCKOUT_MS : current?.lockedUntil || 0;
  loginAttempts.set(email, { count, lockedUntil });
};

const clientLoginSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export const clientLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = clientLoginSchema.parse(req.body);
    let { clientId, password } = validatedData;
    clientId = clientId.trim();

    const attempt = loginAttempts.get(clientId);
    if (attempt && attempt.lockedUntil > Date.now()) {
      res.status(429).json({ success: false, message: 'Account temporarily locked. Try again later.' });
      return;
    }

    const client = await prisma.client.findFirst({
      where: { OR: [{ clientId }, { email: clientId.toLowerCase().trim() }] },
    });

    if (!client) {
      recordFailedAttempt(clientId);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, client.password);
    if (!isPasswordValid) {
      recordFailedAttempt(clientId);
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    if (client.status !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Account is inactive' });
      return;
    }

    loginAttempts.delete(clientId);

    const accessToken = signAccessToken({ id: client.id, email: client.email || '', role: 'CLIENT' });
    const refreshToken = signRefreshToken({ id: client.id, email: client.email || '', role: 'CLIENT' });
    const csrfToken = setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      csrfToken,
      client: {
        id: client.id,
        clientId: client.clientId,
        name: client.name,
        email: client.email,
        company: client.company,
        role: 'CLIENT',
      },
    });
  } catch (error) {
    console.error('Client login error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to login' });
    }
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, requireRefreshSecret());
    } catch (err) {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    if (decoded.type !== 'refresh') {
      clearAuthCookies(res);
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    if (decoded.role === 'CLIENT') {
      const client = await prisma.client.findUnique({ where: { id: decoded.id } });
      if (!client || client.status !== 'ACTIVE') {
        clearAuthCookies(res);
        res.status(401).json({ error: 'User no longer active' });
        return;
      }

      const accessToken = signAccessToken({ id: client.id, email: client.email || '', role: 'CLIENT' });
      const refreshTokenNew = signRefreshToken({ id: client.id, email: client.email || '', role: 'CLIENT' });
      const csrfToken = setAuthCookies(res, accessToken, refreshTokenNew);

      res.status(200).json({
        success: true,
        csrfToken,
        client: {
          id: client.id,
          clientId: client.clientId,
          name: client.name,
          email: client.email,
          company: client.company,
          role: 'CLIENT',
        },
      });
      return;
    }

    const employee = await prisma.employee.findUnique({ where: { id: decoded.id } });
    if (!employee || employee.status !== 'ACTIVE') {
      clearAuthCookies(res);
      res.status(401).json({ error: 'User no longer active' });
      return;
    }

    const accessToken = signAccessToken(employee);
    const refreshTokenNew = signRefreshToken(employee);
    const csrfToken = setAuthCookies(res, accessToken, refreshTokenNew);

    res.status(200).json({
      success: true,
      csrfToken,
      employee: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  clearAuthCookies(res);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (req.user?.role === 'CLIENT') {
      const client = await prisma.client.findUnique({ where: { id: userId } });
      if (!client) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.status(200).json({ success: true, client: sanitizeClient(client) });
      return;
    }

    const employee = await prisma.employee.findUnique({ where: { id: userId } });
    if (!employee) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, employee: sanitizeEmployee(employee) });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
};

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().regex(PASSWORD_REGEX, PASSWORD_POLICY_MESSAGE),
});

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;
    const userId = req.user.id;

    const employee = await prisma.employee.findUnique({ where: { id: userId } });
    if (!employee) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, employee.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.employee.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
};

const updateSelfProfileSchema = z.object({
  name: z.string().min(2, 'Name is required').optional(),
  phone: z.string().optional().nullable(),
});

export const updateSelfProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const validatedData = updateSelfProfileSchema.parse(req.body);

    const employee = await prisma.employee.update({
      where: { id: userId },
      data: validatedData,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: sanitizeEmployee(employee),
    });
  } catch (error) {
    console.error('Update self profile error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  }
};

// OTP is sent to the single configured admin email (ADMIN_EMAIL) — never to an
// arbitrary address supplied by the caller. This keeps the reset flow locked to
// the designated admin mailbox.
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const targetEmail = ADMIN_EMAIL;
  if (!targetEmail) {
    res.status(500).json({ success: false, message: 'ADMIN_EMAIL is not configured' });
    return;
  }

  try {
    const target = await prisma.employee.findUnique({ where: { email: targetEmail } });
    if (!target || !canRequestOtp(targetEmail)) {
      // Generic response: never reveal whether the address exists.
      res.status(200).json({ success: true, message: 'If an account exists for the configured admin email, a reset OTP has been sent to it.' });
      return;
    }

    const result = issueOtp(targetEmail);
    if (!result) {
      res.status(200).json({ success: true, message: 'If an account exists for the configured admin email, a reset OTP has been sent to it.' });
      return;
    }

    if (result.cooldownMs > 0) {
      res.status(429).json({ success: false, message: `Please wait ${Math.ceil(result.cooldownMs / 1000)} seconds before requesting another OTP.` });
      return;
    }

    const sent = await sendOtpEmail(targetEmail, result.code);
    if (!sent) {
      console.error('[AUTH] Failed to send password reset OTP to', targetEmail);
      res.status(500).json({ success: false, message: 'Failed to send OTP email. Please check SMTP configuration or try again later.' });
      return;
    }

    res.status(200).json({ success: true, message: 'If an account exists for the configured admin email, a reset OTP has been sent to it.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process request' });
  }
};

const resetPasswordSchema = z.object({
  otp: z.string().min(4, 'OTP is required'),
  newPassword: z.string().regex(PASSWORD_REGEX, PASSWORD_POLICY_MESSAGE),
});

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const targetEmail = ADMIN_EMAIL;
  if (!targetEmail) {
    res.status(500).json({ success: false, message: 'ADMIN_EMAIL is not configured' });
    return;
  }

  try {
    const validatedData = resetPasswordSchema.parse(req.body);
    const { otp, newPassword } = validatedData;

    const result = verifyOtp(targetEmail, otp);
    if (!result.valid) {
      res.status(400).json({ success: false, message: result.attemptsRemaining > 0 ? `Invalid or expired OTP. ${result.attemptsRemaining} attempts remaining.` : 'Invalid or expired OTP. Please request a new one.' });
      return;
    }

    const employee = await prisma.employee.findUnique({ where: { email: targetEmail } });
    if (!employee) {
      invalidateOtp(targetEmail);
      res.status(404).json({ success: false, message: 'Account not found' });
      return;
    }

    if (newPassword === '') {
      invalidateOtp(targetEmail);
      res.status(400).json({ success: false, message: PASSWORD_POLICY_MESSAGE });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.employee.update({
      where: { id: employee.id },
      data: { password: hashedPassword },
    });

    invalidateOtp(targetEmail);
    clearAuthCookies(res);

    await logAudit({
      userId: employee.id,
      action: 'PASSWORD_RESET',
      message: 'Admin password was reset using email OTP',
      entityType: 'AUTH',
      entityId: employee.id,
    });

    res.status(200).json({ success: true, message: 'Password reset successful. Please log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
  }
};
