import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all idle request data...');
  const result = await prisma.idleLog.deleteMany({});
  console.log(`Successfully cleared ${result.count} idle requests.`);

  console.log('Resetting all paused sessions to ACTIVE...');
  const sessionResult = await prisma.userActivitySession.updateMany({
    where: { status: 'IDLE' },
    data: { status: 'ACTIVE' }
  });
  console.log(`Successfully activated ${sessionResult.count} user sessions.`);

  console.log('Resuming all IDLE_PAUSED timers...');
  const timerResult = await prisma.timerSession.updateMany({
    where: { status: 'IDLE_PAUSED' },
    data: { status: 'RUNNING' }
  });
  console.log(`Successfully resumed ${timerResult.count} timers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
