import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const allEmployees = await prisma.employee.findMany();
  console.log("ALL EMPLOYEES:", allEmployees.map(e => ({ name: e.name, email: e.email, status: e.status })));
}
main().finally(() => prisma.$disconnect());
