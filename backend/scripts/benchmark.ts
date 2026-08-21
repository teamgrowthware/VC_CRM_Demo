import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: [] });

async function measure(name: string, fn: () => Promise<any>) {
  const start = performance.now();
  await fn();
  const end = performance.now();
  console.log(`[BENCHMARK] ${name}: ${(end - start).toFixed(2)} ms`);
}

async function run() {
  console.log('--- Running Benchmarks ---');
  
  // 1. Fetching chat messages for a room (simulate heavily used chat query)
  const room = await prisma.chatRoom.findFirst();
  if (room) {
    await measure('Fetch Messages by Room ID', async () => {
      await prisma.message.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    });
  }

  // 2. Fetching notifications for a user
  const user = await prisma.employee.findFirst();
  if (user) {
    await measure('Fetch Notifications by User ID', async () => {
      await prisma.notification.findMany({
        where: { userId: user.id, isRead: false },
        orderBy: { createdAt: 'desc' }
      });
    });

    // 3. Fetching tasks for a user
    await measure('Fetch Tasks by Assignee', async () => {
      await prisma.task.findMany({
        where: { assignedId: user.id },
        orderBy: { createdAt: 'desc' }
      });
    });

    // 4. Fetching activity logs for a user
    await measure('Fetch Activity Logs by User', async () => {
      await prisma.activityLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    });
  }

  await prisma.$disconnect();
}

run().catch(console.error);
