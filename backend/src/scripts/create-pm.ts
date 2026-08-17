import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Vortex@123', 10);
  
  const pm = await prisma.employee.upsert({
    where: { email: 'pm@demo.com' },
    update: {
      role: 'PROJECT_MANAGER',
    },
    create: {
      employeeId: 'EMP-PM-001',
      name: 'Demo Project Manager',
      email: 'pm@demo.com',
      password: password,
      designation: 'Senior Project Manager',
      role: 'PROJECT_MANAGER',
      status: 'ACTIVE',
    },
  });

  console.log('Project Manager user created/updated:', pm);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
