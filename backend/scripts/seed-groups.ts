import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDefaultGroups() {
  const groups = ['Management', 'Developers', 'HR', 'Sales', 'Support'];

  for (const name of groups) {
    const exists = await prisma.chatRoom.findFirst({ where: { name, type: 'GROUP' } });
    if (!exists) {
      await prisma.chatRoom.create({
        data: {
          name,
          description: `Default system group for ${name}`,
          type: 'GROUP',
          isArchived: false,
          isDeleted: false,
        }
      });
      console.log(`Created default group: ${name}`);
    } else {
      console.log(`Group already exists: ${name}`);
    }
  }
}

seedDefaultGroups()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
