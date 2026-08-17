import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSystem() {
  console.log('--- SYSTEM DEBUG START ---');

  try {
    // 1. Check all settings records
    const allSettings = await prisma.systemSettings.findMany();
    console.log(`Found ${allSettings.length} settings records.`);
    console.log('Current Settings:', JSON.stringify(allSettings, null, 2));

    // 2. Check if any users are currently IDLE or PAUSED
    const activeSessions = await prisma.timerSession.findMany({
      where: { status: { not: 'RUNNING' } }
    });
    console.log(`Sessions not running: ${activeSessions.length}`);
    activeSessions.forEach(s => console.log(`User: ${s.employeeId}, Status: ${s.status}`));

    // 3. Check recent idle logs
    const recentLogs = await prisma.idleLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('Recent Idle Logs:', JSON.stringify(recentLogs, null, 2));

  } catch (error) {
    console.error('Debug Error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('--- SYSTEM DEBUG END ---');
  }
}

debugSystem();
