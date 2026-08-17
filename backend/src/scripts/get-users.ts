import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.employee.findMany();
  users.forEach(u => console.log(`${u.id} | ${u.name} | ${u.email} | ${u.role}`));
}

main().finally(() => prisma.$disconnect());
