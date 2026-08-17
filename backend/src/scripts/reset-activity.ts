import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetActivitySessions() {
  console.log('Resetting all UserActivitySessions to ACTIVE...');

  try {
    const result = await prisma.userActivitySession.updateMany({
      where: {
        status: { not: 'ACTIVE' }
      },
      data: {
        status: 'ACTIVE',
        lastActivityAt: new Date()
      }
    });

    console.log(`Successfully reset ${result.count} activity sessions.`);
  } catch (error) {
    console.error('Error resetting activity sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetActivitySessions();
