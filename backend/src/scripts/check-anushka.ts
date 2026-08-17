import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAnushka() {
  const anushka = await prisma.employee.findFirst({
    where: { name: { contains: 'Anushka', mode: 'insensitive' } }
  });

  if (!anushka) {
    console.log('Anushka not found');
    return;
  }

  console.log('Employee:', anushka.name, anushka.id);
  
  const session = await prisma.userActivitySession.findFirst({
    where: { userId: anushka.id }
  });
  console.log('Session:', session);

  const timer = await prisma.timerSession.findFirst({
    where: { employeeId: anushka.id }
  });
  console.log('Timer:', timer);

  const logs = await prisma.idleLog.findMany({
    where: { userId: anushka.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Logs:', logs);
}

checkAnushka().finally(() => prisma.$disconnect());
