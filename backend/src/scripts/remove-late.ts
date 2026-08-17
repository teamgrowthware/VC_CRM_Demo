import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating LATE attendance to PRESENT...');
  
  // Cast to any since we'll be removing LATE from the types later, but it exists in DB now
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "Attendance" SET status = 'PRESENT' WHERE status = 'LATE';
  `);
  console.log(`Updated ${result} attendance records.`);

  console.log('Removing LATE_ARRIVAL notifications...');
  const notifResult = await prisma.$executeRawUnsafe(`
    DELETE FROM "Notification" WHERE type = 'LATE_ARRIVAL';
  `);
  console.log(`Deleted ${notifResult} notifications.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
