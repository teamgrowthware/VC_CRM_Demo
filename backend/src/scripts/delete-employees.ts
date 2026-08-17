import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ids = ['VC010', 'VC011', 'VC012', 'VC013', 'VC014', 'VC015', 'VC016', 'VC017', 'VC018'];
  const employees = await prisma.employee.findMany({ where: { employeeId: { in: ids } } });
  
  if (employees.length === 0) {
    console.log('No employees found to delete.');
    return;
  }
  
  const empIds = employees.map(e => e.id);
  console.log(`Deleting ${empIds.length} employees...`);

  // Delete all relations safely via Prisma Client
  try { await prisma.attendance.deleteMany({ where: { employeeId: { in: empIds } } }); } catch (e) {}
  try { await prisma.leave.deleteMany({ where: { employeeId: { in: empIds } } }); } catch (e) {}
  try { await prisma.projectMember.deleteMany({ where: { employeeId: { in: empIds } } }); } catch (e) {}
  try { await prisma.task.deleteMany({ where: { OR: [{ assignedId: { in: empIds } }, { createdById: { in: empIds } }] } }); } catch (e) {}
  try { await prisma.comment.deleteMany({ where: { authorId: { in: empIds } } }); } catch (e) {}
  try { await prisma.notification.deleteMany({ where: { userId: { in: empIds } } }); } catch (e) {}
  try { await prisma.activityLog.deleteMany({ where: { userId: { in: empIds } } }); } catch (e) {}
  try { await prisma.timeEntry.deleteMany({ where: { OR: [{ employeeId: { in: empIds } }, { approvedById: { in: empIds } }] } }); } catch (e) {}
  try { await prisma.userActivitySession.deleteMany({ where: { userId: { in: empIds } } }); } catch (e) {}
  try { await prisma.idleLog.deleteMany({ where: { OR: [{ userId: { in: empIds } }, { approvedById: { in: empIds } }, { rejectedById: { in: empIds } }] } }); } catch (e) {}
  try { await prisma.timerSession.deleteMany({ where: { employeeId: { in: empIds } } }); } catch (e) {}
  try { await prisma.dailyReport.deleteMany({ where: { employeeId: { in: empIds } } }); } catch (e) {}
  try { await prisma.chatMember.deleteMany({ where: { employeeId: { in: empIds } } }); } catch (e) {}
  try { await prisma.message.deleteMany({ where: { OR: [{ senderId: { in: empIds } }, { receiverId: { in: empIds } }] } }); } catch (e) {}
  try { await prisma.lead.deleteMany({ where: { assignedId: { in: empIds } } }); } catch (e) {}
  try { await prisma.performanceReview.deleteMany({ where: { OR: [{ employeeId: { in: empIds } }, { reviewerId: { in: empIds } }] } }); } catch (e) {}
  try { await prisma.expense.deleteMany({ where: { OR: [{ employeeId: { in: empIds } }, { paidById: { in: empIds } }, { approvedById: { in: empIds } }] } }); } catch (e) {}
  try { await prisma.penalty.deleteMany({ where: { employeeId: { in: empIds } } }); } catch (e) {}
  try { await prisma.payroll.deleteMany({ where: { employeeId: { in: empIds } } }); } catch (e) {}
  try { await prisma.salaryDeduction.deleteMany({ where: { employeeId: { in: empIds } } }); } catch (e) {}
  try { await prisma.salaryAddon.deleteMany({ where: { employeeId: { in: empIds } } }); } catch (e) {}
  try { await prisma.pettyCash.deleteMany({ where: { handledById: { in: empIds } } }); } catch (e) {}
  try { await prisma.portfolioProject.deleteMany({ where: { createdById: { in: empIds } } }); } catch (e) {}
  try { await prisma.deviceRegistration.deleteMany({ where: { userId: { in: empIds } } }); } catch (e) {}

  // Delete employees themselves
  try {
    const res = await prisma.employee.deleteMany({ where: { employeeId: { in: ids } } });
    console.log('Deleted Employees:', res.count);
  } catch (err) {
    console.error('Final delete failed:', (err as Error).message);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
