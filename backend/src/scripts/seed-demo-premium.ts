import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DEMO_DATABASE_URL || process.env.DATABASE_URL
});

const DEMO_PASSWORD = 'password123';
const NOW = new Date();

function daysFromNow(days: number, hour = 10, min = 0): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return d;
}

function daysAgo(days: number, hour = 10, min = 0): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  d.setHours(hour, min, 0, 0);
  return d;
}

function hoursFromNow(hours: number): Date {
  return new Date(NOW.getTime() + hours * 3600 * 1000);
}

function hoursAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * 3600 * 1000);
}

async function main() {
  if (!process.env.DEMO_DATABASE_URL && !process.env.DATABASE_URL) {
    console.error('Neither DEMO_DATABASE_URL nor DATABASE_URL is set. Cannot run demo seed.');
    return;
  }

  // 1. Wipe existing demo data (children first)
  console.log('Wiping old demo data...');
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chatMember.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.idleLog.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.pilotFeedback.deleteMany();
  await prisma.appHealthLog.deleteMany();
  await prisma.crashLog.deleteMany();
  await prisma.agentHeartbeat.deleteMany();
  await prisma.systemEventLog.deleteMany();
  await prisma.deviceRegistration.deleteMany();
  await prisma.projectPayment.deleteMany();
  await prisma.projectMilestone.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.subTask.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.performanceReview.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.revenue.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.penalty.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.salaryDeduction.deleteMany();
  await prisma.salaryAddon.deleteMany();
  await prisma.pettyCash.deleteMany();
  await prisma.portfolioProject.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.timerPauseInterval.deleteMany();
  await prisma.timerSession.deleteMany();
  await prisma.userActivitySession.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.systemSettings.deleteMany();

  // 2. Setup Departments
  console.log('Setting up departments...');
  const deptEngineering = await prisma.department.create({ data: { name: 'Engineering' } });
  const deptHR = await prisma.department.create({ data: { name: 'Human Resources' } });
  const deptManagement = await prisma.department.create({ data: { name: 'Management' } });

  // 3. Create Employees
  console.log('Creating demo employees...');
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await prisma.employee.create({
    data: {
      employeeId: 'DEMO001',
      name: 'Sarah (Super Admin)',
      email: 'demo.admin@vortexcubes.com',
      password: hashedPassword,
      departmentId: deptManagement.id,
      designation: 'CEO',
      role: 'ADMIN',
      joiningDate: new Date('2024-01-15'),
      baseSalary: 150000,
      status: 'ACTIVE'
    }
  });

  const hr = await prisma.employee.create({
    data: {
      employeeId: 'DEMO002',
      name: 'David (HR Manager)',
      email: 'demo.hr@vortexcubes.com',
      password: hashedPassword,
      departmentId: deptHR.id,
      designation: 'HR Manager',
      role: 'HR',
      joiningDate: new Date('2024-02-01'),
      baseSalary: 80000,
      status: 'ACTIVE'
    }
  });

  const pm = await prisma.employee.create({
    data: {
      employeeId: 'DEMO003',
      name: 'Alex (Project Manager)',
      email: 'demo.pm@vortexcubes.com',
      password: hashedPassword,
      departmentId: deptManagement.id,
      designation: 'Project Manager',
      role: 'PROJECT_MANAGER',
      joiningDate: new Date('2024-03-10'),
      baseSalary: 110000,
      status: 'ACTIVE'
    }
  });

  const dev1 = await prisma.employee.create({
    data: {
      employeeId: 'DEMO004',
      name: 'Jessica (Sr. Developer)',
      email: 'demo.dev1@vortexcubes.com',
      password: hashedPassword,
      departmentId: deptEngineering.id,
      designation: 'Senior Frontend Developer',
      role: 'EMPLOYEE',
      joiningDate: new Date('2024-04-05'),
      baseSalary: 95000,
      status: 'ACTIVE'
    }
  });

  const dev2 = await prisma.employee.create({
    data: {
      employeeId: 'DEMO005',
      name: 'Michael (Backend Dev)',
      email: 'demo.dev2@vortexcubes.com',
      password: hashedPassword,
      departmentId: deptEngineering.id,
      designation: 'Backend Developer',
      role: 'EMPLOYEE',
      joiningDate: new Date('2024-05-12'),
      baseSalary: 85000,
      status: 'ACTIVE'
    }
  });

  const designer = await prisma.employee.create({
    data: {
      employeeId: 'DEMO006',
      name: 'Emma (UI/UX)',
      email: 'demo.design@vortexcubes.com',
      password: hashedPassword,
      departmentId: deptEngineering.id,
      designation: 'UI/UX Designer',
      role: 'EMPLOYEE',
      joiningDate: new Date('2024-06-20'),
      baseSalary: 75000,
      status: 'ACTIVE'
    }
  });

  const allEmployees = [admin, hr, pm, dev1, dev2, designer];

  // 4. Create Projects
  console.log('Creating demo projects...');
  const projCRM = await prisma.project.create({
    data: {
      projectId: 'PRJ-CRM-01',
      name: 'Enterprise CRM Development',
      description: 'Building a next-gen CRM platform for enterprise clients.',
      status: 'ACTIVE',
      managerId: pm.id,
      startDate: new Date('2024-05-01'),
      deadline: daysFromNow(45),
      totalValue: 2500000,
      receivedAmount: 1500000,
      pendingAmount: 1000000,
      members: {
        create: [{ employeeId: dev1.id }, { employeeId: dev2.id }, { employeeId: designer.id }]
      }
    }
  });

  const projAI = await prisma.project.create({
    data: {
      projectId: 'PRJ-AI-01',
      name: 'AI Customer Support Bot',
      description: 'Integrating LLM capabilities into support workflows.',
      status: 'ACTIVE',
      managerId: pm.id,
      startDate: new Date('2024-06-01'),
      deadline: daysFromNow(20),
      totalValue: 1200000,
      receivedAmount: 600000,
      pendingAmount: 600000,
      members: {
        create: [{ employeeId: dev2.id }, { employeeId: designer.id }]
      }
    }
  });

  const projMobile = await prisma.project.create({
    data: {
      projectId: 'PRJ-MOB-01',
      name: 'Retail Mobile App',
      description: 'E-commerce mobile app for Android and iOS.',
      status: 'COMPLETED',
      managerId: pm.id,
      startDate: new Date('2024-01-01'),
      deadline: new Date('2024-04-30'),
      totalValue: 1800000,
      receivedAmount: 1800000,
      pendingAmount: 0,
      financeFinalized: true,
      members: {
        create: [{ employeeId: dev1.id }]
      }
    }
  });

  const projWeb = await prisma.project.create({
    data: {
      projectId: 'PRJ-WEB-01',
      name: 'Corporate Website Redesign',
      description: 'Revamping the main corporate website with modern UI.',
      status: 'PLANNING',
      managerId: pm.id,
      startDate: daysFromNow(10),
      deadline: daysFromNow(120),
      totalValue: 600000,
      receivedAmount: 150000,
      pendingAmount: 450000,
      members: {
        create: [{ employeeId: designer.id }, { employeeId: dev1.id }]
      }
    }
  });

  const projects = [projCRM, projAI, projMobile, projWeb];

  // 5. Create Sprints
  console.log('Creating sprints...');
  const sprint1 = await prisma.sprint.create({
    data: {
      name: 'CRM Sprint 1',
      projectId: projCRM.id,
      goal: 'Core dashboard & authentication',
      startDate: daysAgo(14),
      endDate: daysAgo(2),
      status: 'CLOSED'
    }
  });
  const sprint2 = await prisma.sprint.create({
    data: {
      name: 'CRM Sprint 2',
      projectId: projCRM.id,
      goal: 'Lead management & reporting',
      startDate: daysAgo(2),
      endDate: daysFromNow(12),
      status: 'ACTIVE'
    }
  });

  // 6. Create Tasks
  console.log('Creating tasks...');
  await prisma.task.createMany({
    data: [
      { taskId: 'TSK-01', title: 'Design Dashboard UI', status: 'COMPLETED', priority: 'HIGH', projectId: projCRM.id, assignedId: designer.id, createdById: pm.id, sprintId: sprint1.id, startDate: daysAgo(14), dueDate: daysAgo(6) },
      { taskId: 'TSK-02', title: 'Implement Auth API', status: 'COMPLETED', priority: 'HIGH', projectId: projCRM.id, assignedId: dev2.id, createdById: pm.id, sprintId: sprint1.id, startDate: daysAgo(13), dueDate: daysAgo(4) },
      { taskId: 'TSK-03', title: 'Integrate Frontend Redux', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: projCRM.id, assignedId: dev1.id, createdById: pm.id, sprintId: sprint2.id, startDate: daysAgo(2), dueDate: daysFromNow(6) },
      { taskId: 'TSK-04', title: 'Lead Import from CSV', status: 'IN_PROGRESS', priority: 'URGENT', projectId: projCRM.id, assignedId: dev2.id, createdById: pm.id, sprintId: sprint2.id, startDate: daysAgo(1), dueDate: daysFromNow(3) },
      { taskId: 'TSK-05', title: 'Train NLP Model', status: 'IN_PROGRESS', priority: 'HIGH', projectId: projAI.id, assignedId: dev2.id, createdById: pm.id, startDate: daysAgo(5), dueDate: daysFromNow(10) },
      { taskId: 'TSK-06', title: 'Design Bot Avatar', status: 'TODO', priority: 'LOW', projectId: projAI.id, assignedId: designer.id, createdById: pm.id, startDate: daysFromNow(2), dueDate: daysFromNow(9) },
      { taskId: 'TSK-07', title: 'App Store Submission', status: 'COMPLETED', priority: 'HIGH', projectId: projMobile.id, assignedId: dev1.id, createdById: pm.id, startDate: daysAgo(30), dueDate: daysAgo(12) },
      { taskId: 'TSK-08', title: 'Wireframing', status: 'TODO', priority: 'MEDIUM', projectId: projWeb.id, assignedId: designer.id, createdById: pm.id, startDate: daysFromNow(5), dueDate: daysFromNow(15) },
      { taskId: 'TSK-09', title: 'Fix login redirect bug', status: 'TESTING', priority: 'HIGH', projectId: projCRM.id, assignedId: dev1.id, createdById: pm.id, sprintId: sprint2.id, startDate: daysAgo(1), dueDate: daysFromNow(1), issueType: 'BUG' },
      { taskId: 'TSK-10', title: 'Reports API endpoints', status: 'TODO', priority: 'MEDIUM', projectId: projCRM.id, assignedId: dev2.id, createdById: pm.id, sprintId: sprint2.id, startDate: daysFromNow(2), dueDate: daysFromNow(8) },
      { taskId: 'TSK-11', title: 'Write QA test suite', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: projAI.id, assignedId: dev1.id, createdById: pm.id, startDate: daysAgo(3), dueDate: daysFromNow(7) },
      { taskId: 'TSK-12', title: 'Deploy to staging', status: 'TODO', priority: 'URGENT', projectId: projCRM.id, assignedId: dev2.id, createdById: admin.id, sprintId: sprint2.id, startDate: daysFromNow(1), dueDate: daysFromNow(2) }
    ]
  });

  // Subtasks + comments + documents for a couple of tasks
  const tsk3 = await prisma.task.findUnique({ where: { taskId: 'TSK-03' } });
  const tsk4 = await prisma.task.findUnique({ where: { taskId: 'TSK-04' } });
  if (tsk3 && tsk4) {
    await prisma.subTask.createMany({
      data: [
        { taskId: tsk3.id, title: 'Configure store slices', isDone: true },
        { taskId: tsk3.id, title: 'Connect API client', isDone: false },
        { taskId: tsk4.id, title: 'Parse CSV headers', isDone: true },
        { taskId: tsk4.id, title: 'Map duplicate detection', isDone: false }
      ]
    });
    await prisma.comment.createMany({
      data: [
        { taskId: tsk3.id, authorId: dev1.id, content: 'Store setup is complete, moving to API wiring.', createdAt: daysAgo(1) },
        { taskId: tsk3.id, authorId: pm.id, content: 'Great progress, keep the board updated.', createdAt: hoursAgo(20) },
        { taskId: tsk4.id, authorId: dev2.id, content: 'CSV parsing done, working on validation now.', createdAt: hoursAgo(5) }
      ]
    });
    await prisma.document.create({
      data: { projectId: projCRM.id, taskId: tsk4.id, name: 'Leads-import-spec.pdf', url: 'https://example.com/demo/leads-spec.pdf', type: 'PDF', uploadedAt: daysAgo(2) }
    });
  }

  // 7. Generate 7 days of Attendance
  console.log('Generating attendance...');
  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'HALFDAY', 'PRESENT', 'PRESENT'];

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(9, 0, 0, 0);

    for (const emp of allEmployees) {
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const randStatus = statuses[Math.floor(Math.random() * statuses.length)];

      let punchIn = new Date(date);
      let punchOut = new Date(date);
      punchOut.setHours(18, 0, 0, 0);

      if (randStatus === 'HALFDAY') {
        punchIn.setHours(12, 0, 0, 0);
        punchOut.setHours(14, 0, 0, 0);
      }

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date,
          punchIn,
          punchOut,
          status: randStatus as any,
          totalHours: randStatus === 'HALFDAY' ? 4.5 : 8.5
        }
      });
    }
  }

  // 8. Leaves
  console.log('Creating leaves...');
  await prisma.leave.create({
    data: {
      employeeId: dev1.id,
      leaveType: 'SICK',
      startDate: daysFromNow(5),
      endDate: daysFromNow(5),
      numberOfDays: 1,
      reason: 'Fever and body ache.',
      status: 'APPROVED'
    }
  });
  await prisma.leave.create({
    data: {
      employeeId: dev2.id,
      leaveType: 'CASUAL',
      startDate: daysFromNow(8),
      endDate: daysFromNow(9),
      numberOfDays: 2,
      reason: 'Personal work at home.',
      status: 'PENDING'
    }
  });
  await prisma.leave.create({
    data: {
      employeeId: designer.id,
      leaveType: 'EARNED',
      startDate: daysFromNow(15),
      endDate: daysFromNow(19),
      numberOfDays: 5,
      reason: 'Annual vacation.',
      status: 'PENDING'
    }
  });
  await prisma.leave.create({
    data: {
      employeeId: hr.id,
      leaveType: 'SICK',
      startDate: daysAgo(10),
      endDate: daysAgo(9),
      numberOfDays: 2,
      reason: 'Medical checkup.',
      status: 'APPROVED'
    }
  });

  // 9. Holidays
  console.log('Creating holidays...');
  const holidayNames = ['Independence Day', 'Diwali', 'Christmas'];
  await prisma.holiday.createMany({
    data: holidayNames.map((name, i) => ({
      name,
      date: daysFromNow(15 + i * 30),
      type: i === 2 ? 'PUBLIC' : 'PUBLIC'
    }))
  });

  // 10. Leads
  console.log('Creating leads...');
  await prisma.lead.createMany({
    data: [
      { name: 'Acme Corp Redesign', email: 'demo_lead1@example.com', phone: '9876543210', source: 'Website', status: 'NEW', assignedId: pm.id, notes: 'Wants a full website revamp by Q1.' },
      { name: 'Globex Software', email: 'demo_lead2@example.com', phone: '9123456780', source: 'LinkedIn', status: 'CONTACTED', assignedId: pm.id, notes: 'Interested in the CRM product.' },
      { name: 'Initech Automation', email: 'demo_lead3@example.com', phone: '9000111222', source: 'Referral', status: 'QUALIFIED', assignedId: admin.id, notes: 'Budget confirmed, waiting for proposal.' },
      { name: 'Umbrella Health', email: 'demo_lead4@example.com', phone: '9111222333', source: 'Website', status: 'LOST', assignedId: pm.id, notes: 'Went with a competitor.' },
      { name: 'Stark Industries', email: 'demo_lead5@example.com', phone: '9222333444', source: 'LinkedIn', status: 'NEW', assignedId: pm.id, notes: 'Asked for a discovery call.' }
    ]
  });

  // 11. Expenses
  console.log('Creating expenses...');
  await prisma.expense.createMany({
    data: [
      { employeeId: dev1.id, amount: 4500, category: 'Travel', description: 'Cab fare for client meeting.', status: 'APPROVED', paymentMode: 'UPI', date: daysAgo(4) },
      { employeeId: dev2.id, amount: 1200, category: 'Meals', description: 'Team lunch during sprint planning.', status: 'PENDING', paymentMode: 'UPI', date: daysAgo(1) },
      { employeeId: designer.id, amount: 7999, category: 'Software', description: 'Figma Professional license.', status: 'PENDING', paymentMode: 'Card', date: daysAgo(2) },
      { employeeId: hr.id, amount: 6500, category: 'Gadgets', description: 'External monitor for the new hire.', status: 'APPROVED', paymentMode: 'Bank Transfer', date: daysAgo(6) }
    ]
  });

  // 12. Penalties
  console.log('Creating penalties...');
  await prisma.penalty.create({
    data: { employeeId: dev1.id, amount: 200, reason: 'Late arrival without intimation.', date: daysAgo(3) }
  });
  await prisma.penalty.create({
    data: { employeeId: designer.id, amount: 100, reason: 'Idle time on tracked timer.', date: daysAgo(5) }
  });

  // 13. Meetings
  console.log('Creating meetings...');
  await prisma.meeting.create({
    data: {
      title: 'CRM Sprint 2 Planning',
      startTime: hoursFromNow(4),
      endTime: hoursFromNow(5),
      location: 'G-Meet',
      projectId: projCRM.id,
      meetingUrl: 'https://meet.google.com/demo-planning',
      participants: { connect: [{ id: pm.id }, { id: dev1.id }, { id: dev2.id }] }
    }
  });
  await prisma.meeting.create({
    data: {
      title: 'Client Demo Walkthrough',
      startTime: hoursFromNow(26),
      endTime: hoursFromNow(27),
      location: 'Office',
      projectId: projCRM.id,
      participants: { connect: [{ id: admin.id }, { id: pm.id }] }
    }
  });
  await prisma.meeting.create({
    data: {
      title: '1:1 with Jessica',
      startTime: hoursAgo(30),
      endTime: hoursAgo(29),
      location: 'G-Meet',
      participants: { connect: [{ id: pm.id }, { id: dev1.id }] }
    }
  });

  // 14. Events + Announcements
  console.log('Creating events and announcements...');
  await prisma.event.createMany({
    data: [
      { title: 'Team Outing - Weekend Picnic', type: 'OUTING', location: 'City Park', date: daysFromNow(10), description: 'Annual team picnic with games and lunch.' },
      { title: 'React Masterclass', type: 'TRAINING', location: 'Online', date: daysFromNow(6), description: 'Advanced React patterns by the senior team.' },
      { title: 'Diwali Celebration', type: 'CELEBRATION', location: 'Office', date: daysFromNow(20), description: 'Office celebration with sweets and lights.' }
    ]
  });
  await prisma.announcement.createMany({
    data: [
      { title: 'New office timings', message: 'Starting next Monday, office hours are 9:30 AM - 6:30 PM. Reach out to HR for any queries.', priority: 'HIGH', isActive: true },
      { title: 'Company-wide hackathon', message: 'Hackathon scheduled for the last Friday of this month. Form teams and register with HR.', priority: 'MEDIUM', isActive: true }
    ]
  });

  // 15. Revenue
  console.log('Creating revenue entries...');
  await prisma.revenue.createMany({
    data: [
      { amount: 250000, source: 'Client - Enterprise CRM', description: 'Advance payment for CRM project.', date: daysAgo(15) },
      { amount: 180000, source: 'Client - Retail Mobile App', description: 'Final settlement.', date: daysAgo(25) },
      { amount: 120000, source: 'Project - AI Support Bot', description: 'Milestone 1 payment.', date: daysAgo(5) }
    ]
  });

  // 16. Portfolio Projects
  console.log('Creating portfolio projects...');
  await prisma.portfolioProject.createMany({
    data: [
      { title: 'Vortex CRM Platform', description: 'Full-stack CRM used internally by Vortex Cubes.', technologiesUsed: 'React, Node, PostgreSQL', projectLink: 'https://vortexcubes.com', completionDate: daysAgo(60), createdById: dev1.id },
      { title: 'Fintech Dashboard', description: 'Analytics dashboard for a fintech startup.', technologiesUsed: 'Next.js, Recharts, Prisma', projectLink: 'https://example.com/fintech', completionDate: daysAgo(120), createdById: dev2.id },
      { title: 'Brand Design System', description: 'Complete design system with tokens and components.', technologiesUsed: 'Figma, Storybook', completionDate: daysAgo(90), createdById: designer.id }
    ]
  });

  // 17. Project Finance - Milestones + Payments + Invoices
  console.log('Creating project finance data...');
  const m1 = await prisma.projectMilestone.create({
    data: {
      projectId: projCRM.id,
      title: 'Milestone 1 - Discovery & Design',
      amount: 500000,
      paidAmount: 500000,
      dueDate: daysAgo(20),
      status: 'PAID',
      notes: 'Paid in full via bank transfer.'
    }
  });
  await prisma.projectMilestone.create({
    data: {
      projectId: projCRM.id,
      title: 'Milestone 2 - Core Development',
      amount: 750000,
      paidAmount: 250000,
      dueDate: daysFromNow(10),
      status: 'PARTIALLY_PAID'
    }
  });
  await prisma.projectMilestone.create({
    data: {
      projectId: projAI.id,
      title: 'Milestone 1 - Model Integration',
      amount: 400000,
      paidAmount: 0,
      dueDate: daysAgo(3),
      status: 'OVERDUE'
    }
  });

  await prisma.projectPayment.createMany({
    data: [
      { projectId: projCRM.id, milestoneId: m1.id, amount: 500000, date: daysAgo(20), mode: 'Bank Transfer', transactionId: 'TXN-DEMO-001', createdById: admin.id, notes: 'M1 advance' },
      { projectId: projCRM.id, amount: 250000, date: daysAgo(5), mode: 'UPI', transactionId: 'TXN-DEMO-002', createdById: admin.id, notes: 'Partial M2 payment' },
      { projectId: projAI.id, amount: 120000, date: daysAgo(5), mode: 'Cash', createdById: admin.id }
    ]
  });

  const invoice1 = await prisma.invoice.create({
    data: {
      clientName: 'Acme Corp',
      projectId: projCRM.id,
      amount: 250000,
      status: 'PAID',
      dueDate: daysAgo(3),
      items: {
        create: [
          { description: 'M2 partial milestone', hours: 40, rate: 5000, total: 200000 },
          { description: 'Design revision', hours: 10, rate: 5000, total: 50000 }
        ]
      }
    }
  });
  const invoice2 = await prisma.invoice.create({
    data: {
      clientName: 'Globex Software',
      projectId: projAI.id,
      amount: 400000,
      status: 'SENT',
      dueDate: daysFromNow(7),
      items: {
        create: [
          { description: 'AI model integration', hours: 80, rate: 5000, total: 400000 }
        ]
      }
    }
  });

  // 18. Time Entries
  console.log('Creating time entries...');
  await prisma.timeEntry.createMany({
    data: [
      { taskId: (await prisma.task.findUnique({ where: { taskId: 'TSK-03' } }))!.id, projectId: projCRM.id, employeeId: dev1.id, startTime: daysAgo(1), endTime: hoursAgo(1), durationMinutes: 420, description: 'Working on Redux integration', workCategory: 'DEVELOPMENT', productivityRating: 4, status: 'SUBMITTED', isBillable: true },
      { taskId: (await prisma.task.findUnique({ where: { taskId: 'TSK-04' } }))!.id, projectId: projCRM.id, employeeId: dev2.id, startTime: daysAgo(1), endTime: hoursAgo(1), durationMinutes: 390, description: 'CSV import & validation', workCategory: 'DEVELOPMENT', productivityRating: 5, status: 'SUBMITTED', isBillable: true },
      { taskId: (await prisma.task.findUnique({ where: { taskId: 'TSK-05' } }))!.id, projectId: projAI.id, employeeId: dev2.id, startTime: daysAgo(2), endTime: daysAgo(1), durationMinutes: 460, description: 'NLP model tuning', workCategory: 'RESEARCH', productivityRating: 4, status: 'APPROVED', isBillable: true },
      { taskId: (await prisma.task.findUnique({ where: { taskId: 'TSK-01' } }))!.id, projectId: projCRM.id, employeeId: designer.id, startTime: daysAgo(3), endTime: daysAgo(2), durationMinutes: 380, description: 'Dashboard UI design', workCategory: 'DESIGN', productivityRating: 5, status: 'APPROVED', isBillable: true }
    ]
  });

  // A running timer session for the demo dev (to showcase live timer)
  await prisma.timerSession.create({
    data: {
      employeeId: dev1.id,
      taskId: (await prisma.task.findUnique({ where: { taskId: 'TSK-03' } }))!.id,
      projectId: projCRM.id,
      startTime: hoursAgo(2),
      isActive: true,
      status: 'RUNNING',
      description: 'Frontend store wiring',
      workCategory: 'DEVELOPMENT'
    }
  });
  await prisma.userActivitySession.create({
    data: { userId: admin.id, status: 'ACTIVE', deviceInfo: 'Demo Browser', lastActivityAt: NOW }
  });

  // 19. Payroll + Salary adjustments
  console.log('Creating payroll...');
  const month = NOW.getMonth() + 1;
  const year = NOW.getFullYear();
  await prisma.payroll.createMany({
    data: [
      { employeeId: admin.id, month, year, baseSalary: 150000, presentDays: 22, leaveDays: 0, netSalary: 150000, status: 'PAID', paymentMode: 'Bank Transfer', paymentDate: daysAgo(2) },
      { employeeId: hr.id, month, year, baseSalary: 80000, presentDays: 22, leaveDays: 0, netSalary: 80000, status: 'PAID', paymentMode: 'Bank Transfer', paymentDate: daysAgo(2) },
      { employeeId: pm.id, month, year, baseSalary: 110000, presentDays: 21, leaveDays: 1, netSalary: 110000, status: 'PENDING' },
      { employeeId: dev1.id, month, year, baseSalary: 95000, presentDays: 21, leaveDays: 1, lateMarks: 1, halfDays: 1, totalPenalties: 200, totalDeductions: 700, bonus: 5000, netSalary: 99300, status: 'PENDING' },
      { employeeId: dev2.id, month, year, baseSalary: 85000, presentDays: 22, leaveDays: 0, netSalary: 85000, status: 'PENDING' },
      { employeeId: designer.id, month, year, baseSalary: 75000, presentDays: 20, leaveDays: 2, totalPenalties: 100, netSalary: 74900, status: 'PENDING' }
    ]
  });
  await prisma.salaryDeduction.createMany({
    data: [
      { employeeId: dev1.id, type: 'Late', amount: 200, reason: 'Late arrival penalty', month, year, date: daysAgo(3) },
      { employeeId: dev1.id, type: 'Unpaid Leave', amount: 500, reason: 'Half day without prior approval', month, year, date: daysAgo(2) },
      { employeeId: designer.id, type: 'Late', amount: 100, reason: 'Idle time penalty', month, year, date: daysAgo(5) }
    ]
  });
  await prisma.salaryAddon.createMany({
    data: [
      { employeeId: dev1.id, type: 'Bonus', amount: 5000, reason: 'Sprint completion bonus', month, year, date: daysAgo(4) },
      { employeeId: pm.id, type: 'Incentive', amount: 10000, reason: 'Client milestone incentive', month, year, date: daysAgo(6) }
    ]
  });
  const monthLabel = NOW.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const periodLabel = `${NOW.toLocaleString('en-US', { month: 'short' })} 01 - ${NOW.toLocaleString('en-US', { month: 'short' })} 31`;
  await prisma.payslip.createMany({
    data: [
      { employeeId: admin.id, month: monthLabel, period: periodLabel, monthInt: month, yearInt: year, netSalary: 150000 },
      { employeeId: hr.id, month: monthLabel, period: periodLabel, monthInt: month, yearInt: year, netSalary: 80000 },
      { employeeId: pm.id, month: monthLabel, period: periodLabel, monthInt: month, yearInt: year, netSalary: 110000 },
      { employeeId: dev1.id, month: monthLabel, period: periodLabel, monthInt: month, yearInt: year, netSalary: 99300 },
      { employeeId: dev2.id, month: monthLabel, period: periodLabel, monthInt: month, yearInt: year, netSalary: 85000 }
    ]
  });

  // 20. Petty cash
  console.log('Creating petty cash...');
  await prisma.pettyCash.createMany({
    data: [
      { date: daysAgo(7), type: 'IN', amount: 10000, category: 'Opening balance', remarks: 'Monthly petty cash float', handledById: admin.id, closingBalance: 10000 },
      { date: daysAgo(5), type: 'OUT', amount: 1500, category: 'Office supplies', remarks: 'Notepads and pens', handledById: admin.id, closingBalance: 8500 },
      { date: daysAgo(2), type: 'OUT', amount: 2000, category: 'Travel', remarks: 'Courier delivery cab', handledById: admin.id, closingBalance: 6500 }
    ]
  });

  // 21. Daily reports
  console.log('Creating daily reports...');
  await prisma.dailyReport.createMany({
    data: [
      { employeeId: dev1.id, date: daysAgo(1), sodText: 'Plan Redux integration for the week.', eodText: 'Wired store slices to API client.', tasksCompleted: 'Redux slices, API client', blockers: 'None' },
      { employeeId: dev2.id, date: daysAgo(1), sodText: 'Continue CSV import feature.', eodText: 'Completed CSV parsing, validation pending.', tasksCompleted: 'CSV parsing, validation', blockers: 'Awaiting sample file' },
      { employeeId: designer.id, date: daysAgo(1), sodText: 'Finish dashboard high-fidelity mockups.', eodText: 'Delivered mockups to development team.', tasksCompleted: 'Dashboard mockups', blockers: 'None' }
    ]
  });

  // 22. Performance reviews
  console.log('Creating performance reviews...');
  await prisma.performanceReview.createMany({
    data: [
      { employeeId: dev1.id, reviewerId: pm.id, rating: 4, feedback: 'Consistently delivers quality frontend work.', period: 'Q3 2026' },
      { employeeId: dev2.id, reviewerId: pm.id, rating: 5, feedback: 'Excellent backend architecture and API design.', period: 'Q3 2026' },
      { employeeId: designer.id, reviewerId: admin.id, rating: 4, feedback: 'Great eye for design and attention to detail.', period: 'Q3 2026' }
    ]
  });

  // 23. Chat rooms + messages
  console.log('Creating chat data...');
  const generalRoom = await prisma.chatRoom.create({
    data: {
      name: 'General',
      type: 'GROUP',
      members: { create: allEmployees.map(e => ({ employeeId: e.id })) }
    }
  });
  const hrRoom = await prisma.chatRoom.create({
    data: {
      name: 'HR Support',
      type: 'HR_SUPPORT',
      members: { create: [{ employeeId: hr.id }, { employeeId: admin.id }, { employeeId: dev1.id }, { employeeId: dev2.id }, { employeeId: designer.id }] }
    }
  });
  const crmRoom = await prisma.chatRoom.create({
    data: {
      name: 'CRM Team',
      type: 'DEPARTMENT',
      members: { create: [{ employeeId: pm.id }, { employeeId: dev1.id }, { employeeId: dev2.id }, { employeeId: designer.id }] }
    }
  });
  await prisma.message.createMany({
    data: [
      { roomId: generalRoom.id, senderId: admin.id, content: 'Welcome everyone to the demo workspace! 🎉', createdAt: daysAgo(1) },
      { roomId: generalRoom.id, senderId: hr.id, content: 'New policy doc is uploaded, please review.', createdAt: hoursAgo(20) },
      { roomId: generalRoom.id, senderId: dev1.id, content: 'Sprint 2 is looking good, let\'s keep it up!', createdAt: hoursAgo(3) },
      { roomId: crmRoom.id, senderId: pm.id, content: 'Stand-up in 15 mins, see you all there.', createdAt: hoursAgo(2) },
      { roomId: crmRoom.id, senderId: dev2.id, content: 'Lead import is 80% done.', createdAt: hoursAgo(1) },
      { roomId: hrRoom.id, senderId: designer.id, content: 'Can I get a second monitor?', createdAt: hoursAgo(6) },
      { roomId: hrRoom.id, senderId: hr.id, content: 'Sure! I have raised a purchase request.', createdAt: hoursAgo(5) }
    ]
  });

  // 24. Notifications
  console.log('Creating notifications...');
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, type: 'PROJECT_UPDATED', message: 'Demo environment initialized successfully.', link: '/dashboard/admin', isRead: false },
      { userId: admin.id, type: 'PAYMENT_DUE_SOON', message: 'AI Bot project milestone is overdue by 3 days.', link: '/dashboard/project-portfolio', isRead: false },
      { userId: pm.id, type: 'TASK_ASSIGNED', message: 'Task "Deploy to staging" assigned to you.', link: '/dashboard/tasks', isRead: false },
      { userId: pm.id, type: 'PENDING_APPROVAL', message: '2 leave requests are waiting for approval.', link: '/dashboard/leaves', isRead: false },
      { userId: hr.id, type: 'PENDING_APPROVAL', message: '3 expenses are waiting for approval.', link: '/dashboard/expenses', isRead: false },
      { userId: dev1.id, type: 'TASK_DUE_SOON', message: 'Task "Fix login redirect bug" is due tomorrow.', link: '/dashboard/tasks', isRead: false },
      { userId: dev2.id, type: 'ENTRY_REJECTED', message: 'Your manual time entry needs a revision.', link: '/dashboard/timesheet', isRead: false },
      { userId: designer.id, type: 'SOD_REMINDER', message: 'Please submit your start-of-day report.', link: '/dashboard/daily-reports', isRead: false },
      { userId: hr.id, type: 'LATE_ARRIVAL', message: 'Jessica was marked late today.', link: '/dashboard/attendance', isRead: false }
    ]
  });

  // 25. Activity logs
  console.log('Creating activity logs...');
  await prisma.activityLog.createMany({
    data: [
      { type: 'PROJECT_CREATED', message: 'Enterprise CRM Development project was created', entityType: 'PROJECT', entityId: projCRM.id, userId: pm.id, createdAt: daysAgo(14) },
      { type: 'TASK_STATUS_CHANGED', message: 'Task TSK-01 moved to COMPLETED', entityType: 'TASK', entityId: 'TSK-01', userId: designer.id, createdAt: daysAgo(6) },
      { type: 'LEAD_CREATED', message: 'New lead "Stark Industries" added', entityType: 'LEAD', entityId: 'lead', userId: pm.id, createdAt: daysAgo(1) },
      { type: 'PAYMENT_RECORDED', message: 'Payment of ₹2,50,000 recorded for CRM project', entityType: 'PROJECT', entityId: projCRM.id, userId: admin.id, createdAt: daysAgo(5) },
      { type: 'LEAVE_APPROVED', message: 'Jessica\'s sick leave was approved', entityType: 'LEAVE', entityId: 'leave', userId: hr.id, createdAt: daysAgo(2) }
    ]
  });

  // 26. System settings
  console.log('Creating system settings...');
  await prisma.systemSettings.create({
    data: {
      officeStartTime: '09:30',
      lateThreshold: '09:45',
      lateComingEnabled: true,
      halfDayEnabled: true,
      lunchDuration: 60,
      breakDuration: 30,
      sodReminderTime: '11:00',
      eodReminderTime: '19:30',
      idleTimeoutMinutes: 10,
      idleWarningSeconds: 60,
      autoPauseTimerEnabled: true,
      requireApprovalToResume: true,
      desktopAppEnabledRoles: ['EMPLOYEE', 'HR', 'MANAGER', 'PROJECT_MANAGER'],
      heartbeatIntervalSeconds: 60,
      autoStartEnabled: true
    }
  });

  console.log('');
  console.log('✅ Premium Demo Environment Seed Complete!');
  console.log('');
  console.log('Demo Admin Login:   demo.admin@vortexcubes.com / password123');
  console.log('Demo HR Login:      demo.hr@vortexcubes.com / password123');
  console.log('Demo PM Login:      demo.pm@vortexcubes.com / password123');
  console.log('Demo Dev Login:     demo.dev1@vortexcubes.com / password123');
  console.log('Demo Designer Login: demo.design@vortexcubes.com / password123');
}

main()
  .catch(e => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
