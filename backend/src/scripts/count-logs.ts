import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.idleLog.groupBy({ by: ['userId'], _count: { userId: true } });
  const users = await prisma.employee.findMany();
  for (const log of logs) {
    const u = users.find(u => u.id === log.userId);
    console.log(`${u?.name}: ${log._count.userId} logs`);
  }
}

main().finally(() => prisma.$disconnect());
