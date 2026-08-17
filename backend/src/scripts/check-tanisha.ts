import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tanisha = await prisma.employee.findFirst({ where: { name: { contains: 'Tanisha' } } });
  if (!tanisha) {
    console.log('Tanisha not found');
    return;
  }
  console.log(`Tanisha ID: ${tanisha.id}`);

  const idleLogs = await prisma.idleLog.findMany({
    where: { userId: tanisha.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('Recent Idle Logs:', idleLogs);

  const systemEvents = await prisma.systemEventLog.findMany({
    where: { device: { userId: tanisha.id } },
    orderBy: { timestamp: 'desc' },
    take: 10
  });
  console.log('Recent System Events:', systemEvents);

}

main().finally(() => prisma.$disconnect());
