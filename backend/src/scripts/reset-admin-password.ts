import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@vortexcubes.com';
  // Check if admin exists
  const admin = await prisma.employee.findUnique({ where: { email } });
  
  if (!admin) {
    console.log(`User ${email} not found. Creating...`);
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const count = await prisma.employee.count();
    const employeeId = `EMP-${(count + 1).toString().padStart(3, '0')}`;
    
    await prisma.employee.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        employeeId,
        designation: 'Admin',
      }
    });
    console.log('Admin user created successfully with password: admin123');
  } else {
    console.log(`User ${email} found. Resetting password and role to ADMIN...`);
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.employee.update({
      where: { email },
      data: { password: hashedPassword, status: 'ACTIVE', role: 'ADMIN' }
    });
    console.log('Admin password updated successfully to: admin123, and role set to ADMIN');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
