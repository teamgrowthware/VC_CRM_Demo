import prisma from '../lib/prisma';
import { isWeekend } from '../lib/date-utils';

async function main() {
  console.log('Starting weekend attendance fix...');
  
  const absentRecords = await prisma.attendance.findMany({
    where: {
      status: 'ABSENT',
      punchIn: null // Only fix those who didn't punch in
    }
  });

  console.log(`Found ${absentRecords.length} absent records to check.`);
  
  let fixedCount = 0;
  for (const record of absentRecords) {
    if (isWeekend(record.date)) {
      await prisma.attendance.update({
        where: { id: record.id },
        data: { status: 'WEEKEND' }
      });
      fixedCount++;
    }
  }

  console.log(`Successfully fixed ${fixedCount} records.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
