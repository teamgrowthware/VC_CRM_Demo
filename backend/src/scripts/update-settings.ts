import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSettings() {
  console.log('Updating system settings...');

  try {
    const settings = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: {
        idleTimeoutMinutes: 10,
        idleWarningSeconds: 60
      },
      create: {
        id: 'default',
        idleTimeoutMinutes: 10,
        idleWarningSeconds: 60,
        officeStartTime: '09:30'
      }
    });

    console.log('System settings updated successfully:', settings);
  } catch (error) {
    console.error('Error updating settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSettings();
