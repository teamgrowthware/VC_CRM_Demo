import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAnushka() {
  const anushka = await prisma.employee.findFirst({
    where: { name: { contains: 'Anushka', mode: 'insensitive' } }
  });

  if (!anushka) {
    console.log('Anushka not found');
    return;
  }

  console.log('Found Anushka:', anushka.name, anushka.id);
  
  await prisma.userActivitySession.update({
    where: { userId: anushka.id },
    data: { status: 'ACTIVE', lastActivityAt: new Date() }
  });

  console.log('Successfully updated Anushka\'s session to ACTIVE.');
}

fixAnushka().finally(() => prisma.$disconnect());
