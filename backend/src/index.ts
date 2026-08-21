import './lib/config';
import app from './app';
import { PORT, ADMIN_EMAIL } from './lib/config';

import prisma from './lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const resolveSeedPassword = (): string => {
  if (process.env.ADMIN_SEED_PASSWORD) {
    return process.env.ADMIN_SEED_PASSWORD;
  }
  const generated = crypto.randomBytes(12).toString('base64url');
  console.log('No ADMIN_SEED_PASSWORD set. Generated a random admin password (shown once).');
  return generated;
};

const seedDatabase = async () => {
  try {
    const depts = [
      { id: 'dept_1', name: 'IT department' },
      { id: 'dept_2', name: 'Human Resources' },
      { id: 'dept_3', name: 'Sales' },
      { id: 'dept_4', name: 'Marketing' },
    ];
    for (const d of depts) {
      await prisma.department.upsert({
        where: { id: d.id },
        update: { name: d.name },
        create: d
      }).catch(() => {});
    }

    const existingAdmin = await prisma.employee.findUnique({
      where: { email: ADMIN_EMAIL || 'admin@vortexcubes.com' },
    });

    if (!existingAdmin) {
      const adminPassword = await bcrypt.hash(resolveSeedPassword(), 10);

      await prisma.employee.create({
        data: {
          employeeId: 'VC001',
          name: 'Vortex Admin',
          email: ADMIN_EMAIL || 'admin@vortexcubes.com',
          password: adminPassword,
          designation: 'System Administrator',
          role: 'ADMIN',
          joiningDate: new Date(),
        }
      });

      console.log('Seed completed successfully: Admin account created.');
    } else {
      // Never overwrite the existing admin password on restart.
      console.log('Seed completed successfully: Admin account already exists (password untouched).');
    }
  } catch (error) {
    console.error('Seed error:', error);
  }
};

import { initCronJobs } from './lib/cron';
import { initSocket } from './services/socket.service';
import http from 'http';

const httpServer = http.createServer(app);

initSocket(httpServer);

const server = httpServer.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`Server is running on port ${PORT}`);
  await seedDatabase();
  initCronJobs();
});


// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  console.log('Closing http server.');
  server.close(() => {
    console.log('Http server closed.');
    process.exit(0);
  });
});

// Capture unhandled errors to Sentry
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  try { require('./lib/sentry').Sentry.captureException(reason); } catch {}
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  try { require('./lib/sentry').Sentry.captureException(err); } catch {}
});
