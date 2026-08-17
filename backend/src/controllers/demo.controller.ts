import { Request, Response } from 'express';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import jwt from 'jsonwebtoken';
import prisma, { contextStorage } from '../lib/prisma';
import { JWT_SECRET, DEMO_DATABASE_URL } from '../lib/config';

const execPromise = util.promisify(exec);

const runSeedScript = async (): Promise<void> => {
  if (!DEMO_DATABASE_URL) return;

  // We must run the compiled JS file using node in production, not ts-node
  // In dev, __dirname is src/controllers. In prod, it's dist/controllers.
  const isProd = __dirname.includes('dist');
  const ext = isProd ? 'js' : 'ts';
  const scriptPath = path.join(__dirname, `../scripts/seed-demo-premium.${ext}`);

  const command = isProd ? `node ${scriptPath}` : `npx ts-node ${scriptPath}`;

  await execPromise(command, {
    env: { ...process.env, DEMO_DATABASE_URL, DATABASE_URL: DEMO_DATABASE_URL }
  });
};

const runInDemoContext = async <T>(fn: () => Promise<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    contextStorage.run({ isDemo: true }, async () => {
      try {
        resolve(await fn());
      } catch (err) {
        reject(err);
      }
    });
  });
};

/**
 * One-click demo login. Auto-seeds the demo database on first run so the
 * "Try Demo" button always works regardless of demo DB state.
 */
export const demoLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!DEMO_DATABASE_URL) {
      res.status(400).json({ success: false, message: 'Demo environment is not configured' });
      return;
    }

    // Ensure the demo database is seeded (auto-seed on first click)
    const employeeCount = await runInDemoContext(() => prisma.employee.count());
    if (employeeCount === 0) {
      console.log('Demo database is empty, seeding...');
      await runSeedScript();
    }

    const demoAdmin = await runInDemoContext(() =>
      prisma.employee.findUnique({ where: { email: 'demo.admin@vortexcubes.com' } })
    );

    if (!demoAdmin) {
      console.error('Demo admin not found after seeding.');
      res.status(500).json({ success: false, message: 'Demo admin not found' });
      return;
    }

    if (demoAdmin.status !== 'ACTIVE') {
      res.status(403).json({ success: false, message: 'Demo account is inactive' });
      return;
    }

    const token = jwt.sign(
      { id: demoAdmin.id, email: demoAdmin.email, role: demoAdmin.role },
      JWT_SECRET,
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

    if (!DEMO_DATABASE_URL) {
      res.status(400).json({ success: false, message: 'Demo environment is not configured' });
      return;
    }

    await runSeedScript();

    res.status(200).json({ success: true, message: 'Demo environment has been successfully reset.' });
  } catch (error) {
    console.error('Failed to reset demo environment:', error);
    res.status(500).json({ success: false, message: 'Failed to reset demo environment' });
  }
};
