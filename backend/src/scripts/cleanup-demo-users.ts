import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up old demo employees from main database...');
  
  const employeesToDelete = await prisma.employee.findMany({
    where: {
      OR: [
        { email: { contains: 'demo' } },
        { employeeId: { startsWith: 'EMP-DEMO' } }
      ]
    }
  });

  const employeeIds = employeesToDelete.map(emp => emp.id);

  if (employeeIds.length === 0) {
    console.log('No demo employees found.');
    return;
  }

  console.log(`Found ${employeeIds.length} demo employees to delete. Cleaning up relations...`);

  await prisma.attendance.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.timeEntry.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.userActivitySession.deleteMany({ where: { userId: { in: employeeIds } } });
  await prisma.projectMember.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.task.deleteMany({ where: { assignedId: { in: employeeIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: employeeIds } } });
  await prisma.activityLog.deleteMany({ where: { userId: { in: employeeIds } } });
  await prisma.leave.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.penalty.deleteMany({ where: { employeeId: { in: employeeIds } } });
  
  // Projects where they are manager
  const managedProjects = await prisma.project.findMany({ where: { managerId: { in: employeeIds } } });
  const managedProjectIds = managedProjects.map(p => p.id);
  
  if (managedProjectIds.length > 0) {
    await prisma.projectMember.deleteMany({ where: { projectId: { in: managedProjectIds } } });
    await prisma.task.deleteMany({ where: { projectId: { in: managedProjectIds } } });
    await prisma.projectMilestone.deleteMany({ where: { projectId: { in: managedProjectIds } } });
    await prisma.projectPayment.deleteMany({ where: { projectId: { in: managedProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: managedProjectIds } } });
  }

  const result = await prisma.employee.deleteMany({
    where: { id: { in: employeeIds } }
  });

  console.log(`Successfully deleted ${result.count} old demo employees.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
