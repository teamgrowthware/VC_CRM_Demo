import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSettings() {
  const settings = await prisma.systemSettings.findFirst();
  console.log('Settings:', settings);
}

checkSettings().finally(() => prisma.$disconnect());
