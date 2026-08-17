import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allEmployees = await prisma.employee.findMany();
  let updatedCount = 0;
  for (const emp of allEmployees) {
    const lowerEmail = emp.email.toLowerCase().trim();
    if (emp.email !== lowerEmail) {
      console.log(`Fixing email for ${emp.name}: ${emp.email} -> ${lowerEmail}`);
      await prisma.employee.update({
        where: { id: emp.id },
        data: { email: lowerEmail }
      });
      updatedCount++;
    }
  }
  console.log(`Successfully updated ${updatedCount} employees.`);
}

main().finally(() => prisma.$disconnect());
