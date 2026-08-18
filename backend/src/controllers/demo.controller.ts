import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { requireJwtSecret } from '../lib/config';

/**
 * One-click demo login. Logs in as the demo admin user directly.
 */
export const demoLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const demoAdmin = await prisma.employee.findUnique({
      where: { email: 'demo.admin@vortexcubes.com' }
    });

    if (!demoAdmin) {
      res.status(404).json({ success: false, message: 'Demo account not found. Please seed demo data first.' });
      return;
    }

    if (demoAdmin.status !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Demo account is inactive' });
      return;
    }

    const token = jwt.sign(
      { id: demoAdmin.id, email: demoAdmin.email, role: demoAdmin.role },
      requireJwtSecret(),
      { expiresIn: '365d' }
    );

    res.status(200).json({
      success: true,
      message: 'Demo login successful',
      token,
      employee: {
        id: demoAdmin.id,
        employeeId: demoAdmin.employeeId,
        name: demoAdmin.name,
        email: demoAdmin.email,
        role: demoAdmin.role,
      },
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ success: false, message: 'Failed to login to demo environment' });
  }
};

export const resetDemoEnvironment = async (req: Request, res: Response): Promise<void> => {
  try {
    if ((req as any).user?.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    res.status(200).json({ success: true, message: 'Demo environment reset is not available in single-database mode.' });
  } catch (error) {
    console.error('Failed to reset demo environment:', error);
    res.status(500).json({ success: false, message: 'Failed to reset demo environment' });
  }
};
