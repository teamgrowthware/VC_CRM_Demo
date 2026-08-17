import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function optimizeHeartbeat() {
  console.log('Optimizing heartbeat interval for faster idle detection...');

  try {
    await prisma.systemSettings.update({
      where: { id: 'default' },
      data: {
        heartbeatIntervalSeconds: 30, // 30 seconds for faster sync
        idleTimeoutMinutes: 1, // Set to 1 min as requested for testing
        idleWarningSeconds: 0
      }
    });

    console.log('Settings updated: Heartbeat = 30s, Timeout = 1min.');
  } catch (error) {
    console.error('Error updating settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

optimizeHeartbeat();
