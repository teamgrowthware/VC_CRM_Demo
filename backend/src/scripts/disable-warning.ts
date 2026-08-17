import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeWarningCountdown() {
  console.log('Disabling warning countdown in system settings...');

  try {
    await prisma.systemSettings.update({
      where: { id: 'default' },
      data: {
        idleWarningSeconds: 0
      }
    });

    console.log('Warning countdown disabled successfully.');
  } catch (error) {
    console.error('Error updating settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeWarningCountdown();
