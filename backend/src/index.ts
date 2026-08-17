import './lib/config';
import app from './app';
import { PORT } from './lib/config';

import prisma from './lib/prisma';
import bcrypt from 'bcryptjs';

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

    const adminPassword = await bcrypt.hash('Admin@123', 10);
    
    // Always ensure the admin account exists and password is set
    await prisma.employee.upsert({
      where: { email: 'admin@vortexcubes.com' },
      update: { password: adminPassword, role: 'ADMIN' },
      create: {
        employeeId: 'VC001',
        name: 'Vortex Admin',
        email: 'admin@vortexcubes.com',
        password: adminPassword,
        designation: 'System Administrator',
        role: 'ADMIN',
        joiningDate: new Date(),
      }
    });

    console.log('Seed completed successfully: Admin credentials initialized.');
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

// triggered restart

// triggered restart

// triggered restart

// triggered restart
