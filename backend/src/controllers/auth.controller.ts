import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { z } from 'zod';

import { JWT_SECRET } from '../lib/config';
import { sendWelcomeEmail } from '../services/email.service';
import { contextStorage } from '../lib/prisma';

const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  departmentId: z.string().optional(),
  designation: z.string().optional(),
  role: z.enum(['ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE']).optional(),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);
    let { name, email, password, departmentId, designation, role } = validatedData;
    email = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.employee.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate human-readable employeeId (e.g., EMP-001)
    const count = await prisma.employee.count();
    const employeeId = `EMP-${(count + 1).toString().padStart(3, '0')}`;

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        password: hashedPassword,
        departmentId: departmentId, // note schema expects departmentId not department, Prisma has departmentId
        designation: designation || 'Employee',
        role: role || 'EMPLOYEE',
        employeeId,
      },
    });

    // Send Welcome Email
    await sendWelcomeEmail(employee.email, employee.name);

    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      data: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
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
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);
    let { email, password } = validatedData;
    email = email.toLowerCase().trim();

    const isDemo = email.toLowerCase().includes('demo');
    
    // We must run the login check inside the correct DB context
    const employee = await new Promise<any>((resolve, reject) => {
      contextStorage.run({ isDemo }, async () => {
        try {
          const emp = await prisma.employee.findUnique({ where: { email } });
          resolve(emp);
        } catch (err) {
          reject(err);
        }
      });
    });

    if (!employee) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    if (employee.status !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Account is inactive' });
      return;
    }

    const expiresIn = employee.role === 'ADMIN' ? '365d' : '1d';
    const token = jwt.sign(
      { id: employee.id, email: employee.email, role: employee.role },
      JWT_SECRET,
      { expiresIn }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;
    const userId = (req as any).user.id;

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

export const updateSelfProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const validatedData = updateSelfProfileSchema.parse(req.body);

    const employee = await prisma.employee.update({
      where: { id: userId },
      data: validatedData,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        designation: employee.designation,
        role: employee.role,
        departmentId: employee.departmentId,
      },
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
