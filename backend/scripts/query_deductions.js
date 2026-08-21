const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.employee.findMany({
    where: {
      OR: [
        { name: { contains: 'Lalit', mode: 'insensitive' } },
        { name: { contains: 'Lakshya', mode: 'insensitive' } },
        { name: { contains: 'llakshya', mode: 'insensitive' } },
        { name: { contains: 'lalait', mode: 'insensitive' } }
      ]
    },
    include: {
      penalties: {
        where: {
          date: {
            gte: new Date('2026-07-01T00:00:00Z'),
            lt: new Date('2026-08-01T00:00:00Z')
          }
        }
      },
      salaryDeductions: {
        where: {
          date: {
            gte: new Date('2026-07-01T00:00:00Z'),
            lt: new Date('2026-08-01T00:00:00Z')
          }
        }
      },
      payrolls: {
        where: {
          month: 7
        }
      }
    }
  });

  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
